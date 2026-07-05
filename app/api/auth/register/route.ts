import { NextResponse } from 'next/server';
import { createUser, createSession, findUserByEmail, rateLimit, requestMeta, setSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`register:${ip}`, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток, подождите немного.' }, { status: 429 });
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  const password = body.password ?? '';
  const name = (body.name ?? '').trim();

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Некорректный email.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Пароль должен быть не короче 8 символов.' }, { status: 400 });
  if (name.length > 80 || email.length > 254) return NextResponse.json({ error: 'Слишком длинные данные.' }, { status: 400 });

  if (findUserByEmail(email)) {
    return NextResponse.json({ error: 'Пользователь с таким email уже зарегистрирован.' }, { status: 409 });
  }

  const user = createUser(email, password, name);
  const { token, expiresAt } = createSession(user.id, requestMeta(request));
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}
