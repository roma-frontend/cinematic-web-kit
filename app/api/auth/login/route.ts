import { NextResponse } from 'next/server';
import { createSession, findUserByEmail, rateLimit, setSessionCookie, verifyPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 15)) {
    return NextResponse.json({ error: 'Слишком много попыток, подождите немного.' }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const user = findUserByEmail(body.email ?? '');
  // Always verify against something so a missing user costs the same time
  // as a wrong password (no account-enumeration timing oracle).
  const ok = user
    ? verifyPassword(body.password ?? '', user.passwordHash)
    : (verifyPassword('invalid', 'scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA==:AA=='), false);

  if (!ok || !user) {
    return NextResponse.json({ error: 'Неверный email или пароль.' }, { status: 401 });
  }

  const { token, expiresAt } = createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}
