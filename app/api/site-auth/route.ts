import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, sites, type SiteUser } from '@/lib/db';
import { findUserByEmail, verifyPassword } from '@/lib/auth';
import {
  createSiteUser,
  verifySiteCredentials,
  createSiteSession,
  destroySiteSession,
  getSiteUser,
  siteRequestMeta,
  updateSiteProfile,
  changeSitePassword,
  listSiteSessions,
  revokeSiteSession,
  revokeOtherSiteSessions,
  deleteSiteUser,
  listSiteUserSubmissions,
  listNotifications,
  countUnreadNotifications,
  markNotificationsRead,
} from '@/lib/site-auth';
import { listPublishedMaterials } from '@/lib/site-membership';

export const runtime = 'nodejs';

// Public per-tenant end-user auth + account self-service. Every call is scoped
// to a concrete site id and, for account actions, to the authenticated user of
// THAT site. Completely separate from the platform auth in /api/auth.

const getSite = (siteId: string) => getDb().select().from(sites).where(eq(sites.id, siteId)).get() ?? null;
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Public projection of a site user — never leaks the password hash. */
const pub = (u: SiteUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  status: u.status,
  rejectionReason: u.rejectionReason,
  phone: u.phone,
  avatarColor: u.avatarColor,
  emailNotify: u.emailNotify,
  marketing: u.marketing,
  locale: u.locale,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteId = url.searchParams.get('site') ?? '';
  const resource = url.searchParams.get('resource') ?? 'profile';
  if (!siteId) return NextResponse.json({ user: null });
  const user = await getSiteUser(siteId);
  if (resource === 'profile') return NextResponse.json({ user: user ? pub(user) : null });
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (resource === 'sessions') return NextResponse.json({ sessions: await listSiteSessions(siteId, user.id) });
  if (resource === 'submissions') return NextResponse.json({ submissions: listSiteUserSubmissions(siteId, user.id, user.email) });
  if (resource === 'notifications') return NextResponse.json({ notifications: listNotifications(siteId, user.id), unread: countUnreadNotifications(siteId, user.id) });
  if (resource === 'materials') {
    // Org-isolation: only APPROVED members of THIS site can read its materials.
    if (user.status !== 'approved') return NextResponse.json({ error: 'Доступ только для участников' }, { status: 403 });
    return NextResponse.json({ materials: listPublishedMaterials(siteId) });
  }
  if (resource === 'overview') {
    // Everything the account home screen needs in one round-trip.
    const materials = user.status === 'approved' ? listPublishedMaterials(siteId) : [];
    const notifications = listNotifications(siteId, user.id);
    const submissions = listSiteUserSubmissions(siteId, user.id, user.email);
    const sessions = await listSiteSessions(siteId, user.id);
    return NextResponse.json({
      unread: countUnreadNotifications(siteId, user.id),
      notificationsCount: notifications.length,
      recentNotifications: notifications.slice(0, 3),
      materialsCount: materials.length,
      recentMaterials: materials.slice(0, 3),
      submissionsCount: submissions.length,
      sessionsCount: sessions.length,
    });
  }
  return NextResponse.json({ error: 'Неизвестный ресурс' }, { status: 400 });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }
  const action = typeof body.action === 'string' ? body.action : '';
  const siteId = (typeof body.siteId === 'string' ? body.siteId : '').trim();
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '');
  const bool = (k: string) => (typeof body[k] === 'boolean' ? (body[k] as boolean) : undefined);

  if (action === 'logout') {
    await destroySiteSession();
    return NextResponse.json({ ok: true });
  }

  if (!siteId) return NextResponse.json({ error: 'Сайт не найден' }, { status: 404 });
  const site = getSite(siteId);
  if (!site) return NextResponse.json({ error: 'Сайт не найден' }, { status: 404 });

  // ── Unauthenticated actions ───────────────────────────────────────────
  if (action === 'register') {
    const email = str('email').trim();
    const password = str('password');
    if (!emailOk(email)) return NextResponse.json({ error: 'Введите корректный email' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Пароль должен быть не короче 6 символов' }, { status: 400 });
    try {
      // Org-isolation: if the site requires approval, new members start 'pending'.
      const status = site.memberApproval ? 'pending' : 'approved';
      const user = createSiteUser(siteId, email, password, str('name'), status);
      await createSiteSession(user.id, siteId, siteRequestMeta(request));
      return NextResponse.json({ ok: true, user: pub(user) });
    } catch (e) {
      if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
        return NextResponse.json({ error: 'Пользователь с таким email уже зарегистрирован' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Не удалось зарегистрировать' }, { status: 500 });
    }
  }

  if (action === 'login') {
    const user = verifySiteCredentials(siteId, str('email').trim(), str('password'));
    if (!user) {
      // They may have been promoted to a platform admin (their tenant account
      // was moved to `users`). If the same credentials match a platform user,
      // bounce them to the platform login / dashboard instead of erroring.
      const p = findUserByEmail(str('email').trim());
      if (p && verifyPassword(str('password'), p.passwordHash)) {
        return NextResponse.json({ ok: true, redirect: '/login' });
      }
      return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
    }
    await createSiteSession(user.id, siteId, siteRequestMeta(request));
    return NextResponse.json({ ok: true, user: pub(user) });
  }

  // ── Authenticated account actions ─────────────────────────────────────
  const me = await getSiteUser(siteId);
  if (!me) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  if (action === 'update-profile') {
    const updated = updateSiteProfile(siteId, me.id, {
      name: typeof body.name === 'string' ? (body.name as string) : undefined,
      phone: typeof body.phone === 'string' ? (body.phone as string) : undefined,
      avatarColor: typeof body.avatarColor === 'string' ? (body.avatarColor as string) : undefined,
      emailNotify: bool('emailNotify'),
      marketing: bool('marketing'),
      locale: typeof body.locale === 'string' ? (body.locale as string) : undefined,
    });
    return NextResponse.json({ ok: true, user: updated ? pub(updated) : null });
  }

  if (action === 'change-password') {
    const current = str('currentPassword');
    const next = str('newPassword');
    if (next.length < 6) return NextResponse.json({ error: 'Новый пароль должен быть не короче 6 символов' }, { status: 400 });
    try {
      changeSitePassword(siteId, me.id, current, next);
      return NextResponse.json({ ok: true });
    } catch (e) {
      if (e instanceof Error && e.message === 'WRONG_PASSWORD') {
        return NextResponse.json({ error: 'Текущий пароль неверный' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Не удалось изменить пароль' }, { status: 500 });
    }
  }

  if (action === 'revoke-session') {
    revokeSiteSession(siteId, me.id, str('sessionId'));
    return NextResponse.json({ ok: true });
  }

  if (action === 'revoke-others') {
    await revokeOtherSiteSessions(siteId, me.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark-notifications-read') {
    markNotificationsRead(siteId, me.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete-account') {
    await deleteSiteUser(siteId, me.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
