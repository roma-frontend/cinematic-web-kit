import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listTables, getRows, updateRow, deleteRow } from '@/lib/db-admin';
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
  const table = url.searchParams.get('table');
  if (!table) return NextResponse.json({ tables: listTables() });
  const offset = Number(url.searchParams.get('offset') ?? 0) || 0;
  const q = url.searchParams.get('q') ?? '';
  try {
    return NextResponse.json({ table, ...getRows(table, { offset, q, limit: 50 }) });
  } catch {
    return NextResponse.json({ error: t.tableNotFound }, { status: 404 });
  }
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { action?: string; table?: string; rowid?: number; patch?: Record<string, unknown> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const table = (body.table ?? '').trim();
  const rowid = Number(body.rowid);
  if (!table || !Number.isFinite(rowid)) return NextResponse.json({ error: t.badRequestDot }, { status: 400 });

  try {
    if (body.action === 'update') {
      updateRow(table, rowid, body.patch ?? {});
      recordAudit({ id: me.id, email: me.email }, 'db.update', `${table}#${rowid}`, Object.keys(body.patch ?? {}).join(','));
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'delete') {
      deleteRow(table, rowid);
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
