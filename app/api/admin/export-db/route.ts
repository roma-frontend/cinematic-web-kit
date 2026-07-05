import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { getDb, users, sites, sessions, submissions, domains, audit } from '@/lib/db';

export const runtime = 'nodejs';

// Full-database backup (superadmin only):
// GET /api/admin/export-db            → raw SQLite file
// GET /api/admin/export-db?format=json → JSON snapshot of every table
//   (password hashes and session tokens are redacted — the snapshot is for
//    inspection/archival, not for restoring auth state)
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  if (new URL(request.url).searchParams.get('format') === 'json') {
    const db = getDb();
    const snapshot = {
      exportedAt: new Date().toISOString(),
      exportedBy: me.email,
      users: db.select().from(users).all().map(({ passwordHash: _ph, ...u }) => u),
      sites: db.select().from(sites).all(),
      sessions: db.select().from(sessions).all().map(({ id: _id, ...s }) => s),
      submissions: db.select().from(submissions).all(),
      domains: db.select().from(domains).all(),
      audit: db.select().from(audit).all(),
    };
    const body = JSON.stringify(snapshot, null, 2);
    recordAudit({ id: me.id, email: me.email }, 'data.snapshot', '', `${Math.round(body.length / 1024)} КБ JSON`);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="cwk-snapshot-${stamp}.json"`,
      },
    });
  }

  const dbFile = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'app.db');
  let buf: Buffer;
  try {
    buf = await readFile(dbFile);
  } catch {
    return NextResponse.json({ error: 'Файл БД не найден.' }, { status: 404 });
  }

  recordAudit({ id: me.id, email: me.email }, 'db.export', '', `${Math.round(buf.length / 1024)} КБ`);
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="cwk-backup-${stamp}.db"`,
      'Content-Length': String(buf.length),
    },
  });
}
