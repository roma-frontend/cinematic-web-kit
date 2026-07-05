import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { revokeSession, revokeUserSessions } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Revoke a single session ({ id }) or all sessions of a user ({ userId }).
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  let body: { id?: string; userId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.userId) {
    const n = revokeUserSessions(body.userId);
    recordAudit({ id: me.id, email: me.email }, 'sessions.revoke_user', body.userId, `${n} сессий`);
    return NextResponse.json({ ok: true, revoked: n });
  }
  if (body.id) {
    revokeSession(body.id);
    recordAudit({ id: me.id, email: me.email }, 'session.revoke', body.id);
    return NextResponse.json({ ok: true, revoked: 1 });
  }
  return NextResponse.json({ error: 'Укажите id или userId.' }, { status: 400 });
}
