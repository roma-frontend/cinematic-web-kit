import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getCurrentUser, isSuperadmin, createSession, getSessionToken, requestMeta,
  SESSION_COOKIE, ADMIN_RETURN_COOKIE,
} from '@/lib/auth';
import { getUserById } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Superadmin "login as" (the backdoor): start a session as another user while
// stashing the superadmin's own token so they can return. Guarded strictly.
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  let body: { userId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.userId || body.userId === me.id) {
    return NextResponse.json({ error: 'Некорректный пользователь.' }, { status: 400 });
  }
  const target = getUserById(body.userId);
  if (!target) return NextResponse.json({ error: 'Пользователь не найден.' }, { status: 404 });
  if (!target.isActive) return NextResponse.json({ error: 'Пользователь заблокирован — сначала разблокируйте его.' }, { status: 400 });

  const myToken = await getSessionToken();
  const { token, expiresAt } = createSession(target.id, requestMeta(request));
  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  if (myToken) {
    jar.set(ADMIN_RETURN_COOKIE, myToken, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
  }
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', expires: expiresAt });
  recordAudit({ id: me.id, email: me.email }, 'impersonate', target.email, `${me.email} → ${target.email}`);
  return NextResponse.json({ ok: true, as: { id: target.id, name: target.name, email: target.email } });
}
