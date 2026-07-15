import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listTables, getRows, updateRow, deleteRow, insertRow, exportTable, executeSql, tableForeignKeys, databaseDiagnostics, bulkDeleteRows, listDbHistory, undoDbChange } from '@/lib/db-admin';
import { buildStyledWorkbook } from '@/lib/xlsx-style';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Superadmin-only database browser API.

export async function GET(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const url = new URL(request.url);
  const view = url.searchParams.get('view');
  if (view === 'diagnostics') return NextResponse.json({ diagnostics: databaseDiagnostics() });
  if (view === 'history') return NextResponse.json({ history: listDbHistory(Number(url.searchParams.get('limit')) || 50) });
  const table = url.searchParams.get('table');
  if (!table) return NextResponse.json({ tables: listTables() });
  const offset = Number(url.searchParams.get('offset') ?? 0) || 0;
  const q = url.searchParams.get('q') ?? '';

  // Styled XLSX export of the whole (optionally filtered) table.
  if (url.searchParams.get('export') === 'xlsx') {
    try {
      const { header, rows } = exportTable(table, { q });
      const xlsx = buildStyledWorkbook(table, header, rows);
      recordAudit({ id: me.id, email: me.email }, 'db.export', table, `xlsx, ${rows.length} строк`);
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(xlsx), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="cwk-${table}-${stamp}.xlsx"`,
        },
      });
    } catch {
      return NextResponse.json({ error: t.tableNotFound }, { status: 404 });
    }
  }

  try {
    return NextResponse.json({ table, ...getRows(table, { offset, q, limit: 50 }), foreignKeys: tableForeignKeys(table) });
  } catch {
    return NextResponse.json({ error: t.tableNotFound }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { action?: string; table?: string; rowid?: number; rowids?: number[]; changeId?: number; patch?: Record<string, unknown>; values?: Record<string, unknown>; sql?: string; allowWrite?: boolean; confirmation?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.action === 'sql') {
    const sql = (body.sql ?? '').trim();
    if (!sql || sql.length > 20_000) return NextResponse.json({ error: t.badRequestDot }, { status: 400 });
    if (body.allowWrite && body.confirmation !== 'APPLY CHANGES') return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    try {
      const result = executeSql(sql, Boolean(body.allowWrite));
      recordAudit({ id: me.id, email: me.email }, body.allowWrite ? 'db.sql.write' : 'db.sql.read', '', `${sql.slice(0, 160)} · ${result.changes} changes`);
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      const status = code === 'WRITE_CONFIRM_REQUIRED' ? 409 : 400;
      return NextResponse.json({ error: code === 'WRITE_CONFIRM_REQUIRED' ? 'Enable write mode to run this statement' : code === 'BLOCKED_SQL' ? 'This SQL command is blocked' : 'SQL query failed' }, { status });
    }
  }

  if (body.action === 'undo') {
    try { undoDbChange(Number(body.changeId)); recordAudit({ id: me.id, email: me.email }, 'db.undo', String(body.changeId), ''); return NextResponse.json({ ok: true }); }
    catch { return NextResponse.json({ error: t.dbOperationError }, { status: 400 }); }
  }

  const table = (body.table ?? '').trim();
  if (!table) return NextResponse.json({ error: t.badRequestDot }, { status: 400 });

  try {
    if (body.action === 'bulk-delete') {
      const count = bulkDeleteRows(table, body.rowids ?? [], me.email);
      recordAudit({ id: me.id, email: me.email }, 'db.bulk_delete', table, `${count} rows`);
      return NextResponse.json({ ok: true, count });
    }
    if (body.action === 'insert') {
      const rowid = insertRow(table, body.values ?? {});
      recordAudit({ id: me.id, email: me.email }, 'db.insert', `${table}#${rowid}`, Object.keys(body.values ?? {}).join(','));
      return NextResponse.json({ ok: true, rowid });
    }

    const rowid = Number(body.rowid);
    if (!Number.isFinite(rowid)) return NextResponse.json({ error: t.badRequestDot }, { status: 400 });

    if (body.action === 'update') {
      updateRow(table, rowid, body.patch ?? {}, me.email);
      recordAudit({ id: me.id, email: me.email }, 'db.update', `${table}#${rowid}`, Object.keys(body.patch ?? {}).join(','));
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'delete') {
      deleteRow(table, rowid, me.email);
      recordAudit({ id: me.id, email: me.email }, 'db.delete', `${table}#${rowid}`, '');
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: t.unknownAction }, { status: 400 });
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'BAD_TABLE' || code === 'BAD_COLUMN') return NextResponse.json({ error: t.invalidTableOrColumn }, { status: 400 });
    return NextResponse.json({ error: t.dbOperationError }, { status: 500 });
  }
}
