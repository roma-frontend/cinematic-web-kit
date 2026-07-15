import 'server-only';
import { getRawDb } from '@/lib/db';

// Superadmin database browser. Generic + defensive: table/column identifiers are
// validated against the live schema (never interpolated from raw user input),
// values are always bound parameters, and rows are addressed by rowid.

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface TableInfo { name: string; count: number }
export interface ColumnInfo { name: string; type: string; notnull: boolean; pk: boolean }
export interface ForeignKeyInfo { column: string; targetTable: string; targetColumn: string; onUpdate: string; onDelete: string }
export interface DbHistoryItem { id: number; tableName: string; rowid: number; operation: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; actor: string; createdAt: number; undoneAt: number | null }

function ensureAdminTables(): void {
  getRawDb().exec(`CREATE TABLE IF NOT EXISTS _db_change_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, table_name TEXT NOT NULL, row_id INTEGER NOT NULL,
    operation TEXT NOT NULL, before_json TEXT, after_json TEXT, actor TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL, undone_at INTEGER
  ); CREATE INDEX IF NOT EXISTS _db_history_created_idx ON _db_change_history(created_at DESC);`);
}

export function listTables(): TableInfo[] {
  const db = getRawDb();
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name != '_db_change_history' ORDER BY name")
    .all() as { name: string }[];
  return rows.map((r) => ({
    name: r.name,
    count: Number((db.prepare(`SELECT count(*) n FROM "${r.name}"`).get() as { n: number }).n),
  }));
}

function assertTable(table: string): void {
  if (!IDENT.test(table)) throw new Error('BAD_TABLE');
  const ok = getRawDb().prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!ok) throw new Error('BAD_TABLE');
}

export function tableColumns(table: string): ColumnInfo[] {
  assertTable(table);
  const cols = getRawDb().prepare(`PRAGMA table_info("${table}")`).all() as { name: string; type: string; notnull: number; pk: number }[];
  return cols.map((c) => ({ name: c.name, type: c.type, notnull: !!c.notnull, pk: !!c.pk }));
}

export function tableForeignKeys(table: string): ForeignKeyInfo[] {
  assertTable(table);
  return (getRawDb().prepare(`PRAGMA foreign_key_list("${table}")`).all() as { from: string; table: string; to: string; on_update: string; on_delete: string }[])
    .map((f) => ({ column: f.from, targetTable: f.table, targetColumn: f.to, onUpdate: f.on_update, onDelete: f.on_delete }));
}

export function databaseDiagnostics() {
  const db = getRawDb();
  const integrity = (db.pragma('quick_check') as { quick_check: string }[])[0]?.quick_check ?? 'unknown';
  const pageCount = Number(db.pragma('page_count', { simple: true }));
  const pageSize = Number(db.pragma('page_size', { simple: true }));
  const foreignKeyIssues = (db.pragma('foreign_key_check') as unknown[]).length;
  const tables = listTables();
  const indexes = Number((db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").get() as { n: number }).n);
  return { integrity, sizeBytes: pageCount * pageSize, foreignKeyIssues, indexes, tables: tables.length, rows: tables.reduce((n, t) => n + t.count, 0), journalMode: String(db.pragma('journal_mode', { simple: true })) };
}

export interface RowsResult { columns: ColumnInfo[]; rows: Record<string, unknown>[]; total: number }
export interface SqlResult { columns: string[]; rows: Record<string, unknown>[]; changes: number; truncated: boolean; durationMs: number }

const READ_SQL = /^(SELECT|WITH|EXPLAIN|PRAGMA)\b/i;
const BLOCKED_SQL = /\b(ATTACH|DETACH|VACUUM|REINDEX|LOAD_EXTENSION)\b/i;

/** Execute one SQL statement from the superadmin console. */
export function executeSql(sql: string, allowWrite = false): SqlResult {
  const statement = sql.trim().replace(/;+\s*$/, '');
  if (!statement || statement.includes(';')) throw new Error('BAD_SQL');
  if (BLOCKED_SQL.test(statement)) throw new Error('BLOCKED_SQL');
  const readOnly = READ_SQL.test(statement);
  if (!readOnly && !allowWrite) throw new Error('WRITE_CONFIRM_REQUIRED');

  const db = getRawDb();
  const started = performance.now();
  const prepared = db.prepare(statement);
  if (prepared.reader) {
    const all = prepared.all() as Record<string, unknown>[];
    const rows = all.slice(0, 500);
    return {
      columns: rows[0] ? Object.keys(rows[0]) : prepared.columns().map((c) => c.name),
      rows,
      changes: 0,
      truncated: all.length > rows.length,
      durationMs: Math.round((performance.now() - started) * 10) / 10,
    };
  }
  const info = db.transaction(() => prepared.run())();
  return { columns: [], rows: [], changes: info.changes, truncated: false, durationMs: Math.round((performance.now() - started) * 10) / 10 };
}

export function getRows(table: string, opts: { limit?: number; offset?: number; q?: string } = {}): RowsResult {
  assertTable(table);
  const db = getRawDb();
  const columns = tableColumns(table);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const q = (opts.q ?? '').trim();

  let where = '';
  const params: unknown[] = [];
  if (q) {
    where = ' WHERE ' + columns.map((c) => `CAST("${c.name}" AS TEXT) LIKE ?`).join(' OR ');
    for (const _ of columns) params.push(`%${q}%`);
  }
  const total = Number((db.prepare(`SELECT count(*) n FROM "${table}"${where}`).get(...params) as { n: number }).n);
  const rows = db
    .prepare(`SELECT rowid AS __rowid, * FROM "${table}"${where} ORDER BY rowid DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Record<string, unknown>[];
  return { columns, rows, total };
}

function assertColumns(table: string, keys: string[]): void {
  const valid = new Set(tableColumns(table).map((c) => c.name));
  for (const k of keys) {
    if (!IDENT.test(k) || !valid.has(k)) throw new Error('BAD_COLUMN');
  }
}

/** Update one row (addressed by rowid) and retain an undo snapshot. */
export function updateRow(table: string, rowid: number, patch: Record<string, unknown>, actor = ''): void {
  assertTable(table); ensureAdminTables();
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  assertColumns(table, keys);
  const db = getRawDb();
  const before = db.prepare(`SELECT * FROM "${table}" WHERE rowid = ?`).get(rowid) as Record<string, unknown> | undefined;
  if (!before) throw new Error('ROW_NOT_FOUND');
  const set = keys.map((k) => `"${k}" = ?`).join(', ');
  const values = keys.map((k) => normalize(patch[k]));
  db.transaction(() => {
    db.prepare(`UPDATE "${table}" SET ${set} WHERE rowid = ?`).run(...values, rowid);
    const after = db.prepare(`SELECT * FROM "${table}" WHERE rowid = ?`).get(rowid);
    db.prepare('INSERT INTO _db_change_history(table_name,row_id,operation,before_json,after_json,actor,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(table, rowid, 'update', JSON.stringify(before), JSON.stringify(after), actor, Date.now());
  })();
}

export function deleteRow(table: string, rowid: number, actor = ''): void {
  assertTable(table); ensureAdminTables();
  const db = getRawDb();
  const before = db.prepare(`SELECT * FROM "${table}" WHERE rowid = ?`).get(rowid) as Record<string, unknown> | undefined;
  if (!before) throw new Error('ROW_NOT_FOUND');
  db.transaction(() => {
    db.prepare(`DELETE FROM "${table}" WHERE rowid = ?`).run(rowid);
    db.prepare('INSERT INTO _db_change_history(table_name,row_id,operation,before_json,actor,created_at) VALUES(?,?,?,?,?,?)')
      .run(table, rowid, 'delete', JSON.stringify(before), actor, Date.now());
  })();
}

export function bulkDeleteRows(table: string, rowids: number[], actor = ''): number {
  const ids = [...new Set(rowids)].filter(Number.isFinite).slice(0, 500);
  getRawDb().transaction(() => { for (const id of ids) deleteRow(table, id, actor); })();
  return ids.length;
}

export function listDbHistory(limit = 50): DbHistoryItem[] {
  ensureAdminTables();
  return (getRawDb().prepare('SELECT * FROM _db_change_history ORDER BY id DESC LIMIT ?').all(Math.min(limit, 200)) as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id), tableName: String(r.table_name), rowid: Number(r.row_id), operation: String(r.operation),
    before: r.before_json ? JSON.parse(String(r.before_json)) : null, after: r.after_json ? JSON.parse(String(r.after_json)) : null,
    actor: String(r.actor), createdAt: Number(r.created_at), undoneAt: r.undone_at == null ? null : Number(r.undone_at),
  }));
}

export function undoDbChange(id: number): void {
  ensureAdminTables();
  const db = getRawDb();
  const change = db.prepare('SELECT * FROM _db_change_history WHERE id=? AND undone_at IS NULL').get(id) as Record<string, unknown> | undefined;
  if (!change) throw new Error('CHANGE_NOT_FOUND');
  const table = String(change.table_name); assertTable(table);
  const before = change.before_json ? JSON.parse(String(change.before_json)) as Record<string, unknown> : null;
  if (!before) throw new Error('CHANGE_NOT_REVERSIBLE');
  const keys = Object.keys(before); assertColumns(table, keys);
  const rowid = Number(change.row_id);
  db.transaction(() => {
    const exists = db.prepare(`SELECT 1 FROM "${table}" WHERE rowid=?`).get(rowid);
    if (exists) {
      db.prepare(`UPDATE "${table}" SET ${keys.map((k) => `"${k}"=?`).join(',')} WHERE rowid=?`).run(...keys.map((k) => before[k]), rowid);
    } else {
      db.prepare(`INSERT INTO "${table}" (rowid,${keys.map((k) => `"${k}"`).join(',')}) VALUES (?,${keys.map(() => '?').join(',')})`).run(rowid, ...keys.map((k) => before[k]));
    }
    db.prepare('UPDATE _db_change_history SET undone_at=? WHERE id=?').run(Date.now(), id);
  })();
}

/**
 * Insert one row. `values` keys must be real columns; empty strings become NULL.
 * Returns the rowid of the freshly-created row.
 */
export function insertRow(table: string, values: Record<string, unknown>): number {
  assertTable(table);
  // Only keep keys that map to real columns and carry a non-empty value — this
  // lets DEFAULT / autoincrement columns fill themselves in.
  const cols = tableColumns(table);
  const valid = new Set(cols.map((c) => c.name));
  const keys = Object.keys(values).filter((k) => valid.has(k) && normalize(values[k]) !== null);
  assertColumns(table, keys);
  const db = getRawDb();
  if (keys.length === 0) {
    const info = db.prepare(`INSERT INTO "${table}" DEFAULT VALUES`).run();
    return Number(info.lastInsertRowid);
  }
  const placeholders = keys.map(() => '?').join(', ');
  const columnList = keys.map((k) => `"${k}"`).join(', ');
  const params = keys.map((k) => normalize(values[k]));
  const info = db.prepare(`INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`).run(...params);
  return Number(info.lastInsertRowid);
}

/**
 * Full dump of a table for export: real column names as the header and every
 * row (capped) as an aligned array of primitive values. Optionally filtered by
 * the same free-text `q` used by the browser.
 */
export function exportTable(table: string, opts: { q?: string; limit?: number } = {}): { header: string[]; rows: unknown[][] } {
  assertTable(table);
  const db = getRawDb();
  const columns = tableColumns(table);
  const header = columns.map((c) => c.name);
  const limit = Math.min(Math.max(opts.limit ?? 100000, 1), 500000);
  const q = (opts.q ?? '').trim();

  let where = '';
  const params: unknown[] = [];
  if (q) {
    where = ' WHERE ' + columns.map((c) => `CAST("${c.name}" AS TEXT) LIKE ?`).join(' OR ');
    for (const _ of columns) params.push(`%${q}%`);
  }
  const rows = db
    .prepare(`SELECT * FROM "${table}"${where} ORDER BY rowid DESC LIMIT ?`)
    .all(...params, limit) as Record<string, unknown>[];
  return { header, rows: rows.map((r) => columns.map((c) => r[c.name] ?? '')) };
}

// Coerce form strings into DB-friendly values: '' → NULL, numeric strings kept
// (SQLite column affinity converts), everything else as text.
function normalize(v: unknown): unknown {
  if (v === null || v === undefined || v === '') return null;
  return v;
}
