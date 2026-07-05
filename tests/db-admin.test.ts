import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './helpers';
import { createUser } from '@/lib/auth';
import { listTables, tableColumns, getRows, updateRow, deleteRow } from '@/lib/db-admin';
import { getRawDb } from '@/lib/db';

beforeEach(() => resetDb());

describe('listTables', () => {
  it('lists real tables with counts, excluding sqlite_ internals', () => {
    createUser('a@x.com', 'pw', 'A');
    const tables = listTables();
    const names = tables.map((t) => t.name);
    expect(names).toContain('users');
    expect(names.every((n) => !n.startsWith('sqlite_'))).toBe(true);
    expect(tables.find((t) => t.name === 'users')?.count).toBe(1);
  });
});

describe('tableColumns', () => {
  it('returns column metadata', () => {
    const cols = tableColumns('users');
    const id = cols.find((c) => c.name === 'id')!;
    expect(id.pk).toBe(true);
    expect(cols.find((c) => c.name === 'email')?.notnull).toBe(true);
  });
  it('rejects bad identifiers and unknown tables', () => {
    expect(() => tableColumns('bad name')).toThrow('BAD_TABLE');
    expect(() => tableColumns('nonexistent_table')).toThrow('BAD_TABLE');
  });
});

describe('getRows', () => {
  it('paginates and clamps limits', () => {
    createUser('a@x.com', 'pw', 'A');
    createUser('b@x.com', 'pw', 'B');
    const res = getRows('users', { limit: 999, offset: 0 });
    expect(res.total).toBe(2);
    expect(res.rows.length).toBe(2);
    expect(res.columns.length).toBeGreaterThan(0);
    // rowid present
    expect(res.rows[0]).toHaveProperty('__rowid');
  });

  it('filters with q', () => {
    createUser('alice@x.com', 'pw', 'Alice');
    createUser('bob@x.com', 'pw', 'Bob');
    const res = getRows('users', { q: 'alice' });
    expect(res.total).toBe(1);
    expect(res.rows.length).toBe(1);
  });

  it('applies offset', () => {
    createUser('a@x.com', 'pw', 'A');
    createUser('b@x.com', 'pw', 'B');
    const res = getRows('users', { limit: 1, offset: 1 });
    expect(res.rows.length).toBe(1);
    expect(res.total).toBe(2);
  });
});

describe('updateRow / deleteRow', () => {
  it('updates a row addressed by rowid, coercing empty to null', () => {
    createUser('a@x.com', 'pw', 'A');
    const rowid = (getRawDb().prepare('SELECT rowid AS r FROM users').get() as { r: number }).r;
    updateRow('users', rowid, { name: 'Renamed', locked_until: '' });
    const row = getRawDb().prepare('SELECT name, locked_until FROM users').get() as { name: string; locked_until: unknown };
    expect(row.name).toBe('Renamed');
    expect(row.locked_until).toBeNull();
  });

  it('no-ops for empty patch', () => {
    createUser('a@x.com', 'pw', 'A');
    const rowid = (getRawDb().prepare('SELECT rowid AS r FROM users').get() as { r: number }).r;
    expect(() => updateRow('users', rowid, {})).not.toThrow();
  });

  it('rejects bad column', () => {
    createUser('a@x.com', 'pw', 'A');
    const rowid = (getRawDb().prepare('SELECT rowid AS r FROM users').get() as { r: number }).r;
    expect(() => updateRow('users', rowid, { 'evil col': 'x' })).toThrow('BAD_COLUMN');
    expect(() => updateRow('users', rowid, { not_a_column: 'x' })).toThrow('BAD_COLUMN');
  });

  it('deletes a row', () => {
    createUser('a@x.com', 'pw', 'A');
    const rowid = (getRawDb().prepare('SELECT rowid AS r FROM users').get() as { r: number }).r;
    deleteRow('users', rowid);
    expect((getRawDb().prepare('SELECT count(*) n FROM users').get() as { n: number }).n).toBe(0);
  });
});
