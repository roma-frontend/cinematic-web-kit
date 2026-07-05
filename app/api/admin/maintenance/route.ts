import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { cleanupExpiredSessions } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Superadmin maintenance actions: POST { action: 'cleanup-sessions' }.
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  let body: { action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.action === 'cleanup-sessions') {
    const n = cleanupExpiredSessions();
    recordAudit({ id: me.id, email: me.email }, 'maintenance.cleanup_sessions', '', `${n} сессий удалено`);
    return NextResponse.json({ ok: true, removed: n });
  }
  return NextResponse.json({ error: 'Неизвестное действие.' }, { status: 400 });
}
