import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Download a raw snapshot of the SQLite database (superadmin backup).
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  const dbFile = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'app.db');
  let buf: Buffer;
  try {
    buf = await readFile(dbFile);
  } catch {
    return NextResponse.json({ error: 'Файл БД не найден.' }, { status: 404 });
  }

  recordAudit({ id: me.id, email: me.email }, 'db.export', '', `${Math.round(buf.length / 1024)} КБ`);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
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
