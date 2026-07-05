import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, sites } from '@/lib/db';
import {
  createSiteUser,
  verifySiteCredentials,
  createSiteSession,
  destroySiteSession,
  getSiteUser,
} from '@/lib/site-auth';

export const runtime = 'nodejs';

// Public per-tenant end-user auth. Every call is scoped to a concrete site id.
// Completely separate from the platform auth in /api/auth (different cookie).

const siteExists = (siteId: string) => Boolean(getDb().select({ id: sites.id }).from(sites).where(eq(sites.id, siteId)).get());
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pub = (u: { id: string; email: string; name: string }) => ({ id: u.id, email: u.email, name: u.name });

export async function GET(request: Request) {
  const siteId = new URL(request.url).searchParams.get('site') ?? '';
  if (!siteId) return NextResponse.json({ user: null });
  const user = await getSiteUser(siteId);
  return NextResponse.json({ user: user ? pub(user) : null });
}

export async function POST(request: Request) {
  let body: { action?: string; siteId?: string; email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }
  const { action } = body;
  const siteId = (body.siteId ?? '').trim();

  if (action === 'logout') {
    await destroySiteSession();
    return NextResponse.json({ ok: true });
  }

  if (!siteId || !siteExists(siteId)) return NextResponse.json({ error: 'Сайт не найден' }, { status: 404 });
  const email = (body.email ?? '').trim();
  const password = body.password ?? '';

  if (action === 'register') {
    if (!emailOk(email)) return NextResponse.json({ error: 'Введите корректный email' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Пароль должен быть не короче 6 символов' }, { status: 400 });
    try {
      const user = createSiteUser(siteId, email, password, body.name ?? '');
      await createSiteSession(user.id, siteId);
      return NextResponse.json({ ok: true, user: pub(user) });
    } catch (e) {
      if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
        return NextResponse.json({ error: 'Пользователь с таким email уже зарегистрирован' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Не удалось зарегистрировать' }, { status: 500 });
    }
  }

  if (action === 'login') {
    const user = verifySiteCredentials(siteId, email, password);
    if (!user) return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    await createSiteSession(user.id, siteId);
    return NextResponse.json({ ok: true, user: pub(user) });
  }

  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
