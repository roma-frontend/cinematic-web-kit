import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, desc, eq, gt, ne, or, sql } from 'drizzle-orm';
import { getDb, newId, siteUsers, siteSessions, submissions, type SiteUser } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

// Per-tenant END-USER auth — fully isolated from the platform's own auth
// (lib/auth.ts). Different cookie, different tables, always scoped by siteId so
// one tenant's customers can never be confused with another's or with the
// platform accounts.
export const SITE_SESSION_COOKIE = 'cwk_site';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACTIVE_BUMP_MS = 60 * 1000; // throttle lastActiveAt writes to once/min

export interface SiteSessionMeta {
  userAgent?: string;
  ip?: string;
}

/** Extract a device fingerprint from an incoming request (best-effort). */
export function siteRequestMeta(request: Request): SiteSessionMeta {
  const ua = request.headers.get('user-agent') ?? '';
  const ip =
    (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '';
  return { userAgent: ua.slice(0, 400), ip: ip.slice(0, 64) };
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const normEmail = (e: string) => e.trim().toLowerCase();

export function getSiteUserByEmail(siteId: string, email: string): SiteUser | null {
  return (
    getDb()
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.email, normEmail(email))))
      .get() ?? null
  );
}

export function getSiteUserById(siteId: string, id: string): SiteUser | null {
  return (
    getDb()
      .select()
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.id, id)))
      .get() ?? null
  );
}

/** Create an end-user for a site. Throws 'EMAIL_TAKEN' if the email already
 *  exists ON THIS SITE (the same email is fine on a different site). The initial
 *  membership `status` is decided by the caller (based on the site's approval
 *  policy): 'approved' grants immediate access, 'pending' awaits admin review. */
export function createSiteUser(
  siteId: string,
  email: string,
  password: string,
  name = '',
  status: 'approved' | 'pending' = 'approved',
): SiteUser {
  const normalized = normEmail(email);
  if (getSiteUserByEmail(siteId, normalized)) throw new Error('EMAIL_TAKEN');
  const now = new Date();
  const user: SiteUser = {
    id: newId('su'),
    siteId,
    email: normalized,
    name: name.trim(),
    passwordHash: hashPassword(password),
    status,
    approvedBy: null,
    approvedAt: status === 'approved' ? now : null,
    rejectionReason: '',
    phone: '',
    avatarColor: '',
    emailNotify: true,
    marketing: false,
    locale: '',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  getDb().insert(siteUsers).values(user).run();
  return user;
}

export function verifySiteCredentials(siteId: string, email: string, password: string): SiteUser | null {
  const user = getSiteUserByEmail(siteId, email);
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

/** Issue a session for a site end-user and set the isolated cookie. */
export async function createSiteSession(siteUserId: string, siteId: string, meta: SiteSessionMeta = {}): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  getDb()
    .insert(siteSessions)
    .values({
      id: hashToken(token),
      siteUserId,
      siteId,
      expiresAt: new Date(now + SESSION_TTL_MS),
      createdAt: new Date(now),
      lastActiveAt: new Date(now),
      userAgent: meta.userAgent ?? '',
      ip: meta.ip ?? '',
    })
    .run();
  getDb().update(siteUsers).set({ lastLoginAt: new Date(now) }).where(eq(siteUsers.id, siteUserId)).run();
  const jar = await cookies();
  jar.set(SITE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** The end-user for the CURRENT site, or null. Validates the session belongs to
 *  this exact site so a cookie from another tenant site can't leak across. */
export async function getSiteUser(siteId: string): Promise<SiteUser | null> {
  const jar = await cookies();
  const token = jar.get(SITE_SESSION_COOKIE)?.value;
  if (!token) return null;
  const sid = hashToken(token);
  const row = getDb()
    .select({ user: siteUsers, lastActiveAt: siteSessions.lastActiveAt })
    .from(siteSessions)
    .innerJoin(siteUsers, eq(siteSessions.siteUserId, siteUsers.id))
    .where(and(eq(siteSessions.id, sid), eq(siteSessions.siteId, siteId), gt(siteSessions.expiresAt, new Date())))
    .get();
  if (!row) return null;
  // Presence heartbeat (throttled).
  const last = row.lastActiveAt ? new Date(row.lastActiveAt).getTime() : 0;
  if (Date.now() - last > ACTIVE_BUMP_MS) {
    getDb().update(siteSessions).set({ lastActiveAt: new Date() }).where(eq(siteSessions.id, sid)).run();
  }
  return row.user;
}

/** Log out the current site end-user: delete the session row + clear cookie. */
export async function destroySiteSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SITE_SESSION_COOKIE)?.value;
  if (token) getDb().delete(siteSessions).where(eq(siteSessions.id, hashToken(token))).run();
  jar.delete(SITE_SESSION_COOKIE);
}

// ── Account self-service (all scoped to the authenticated user + site) ──────

/** Update editable profile fields. Only whitelisted keys are applied. */
export function updateSiteProfile(
  siteId: string,
  userId: string,
  patch: { name?: string; phone?: string; avatarColor?: string; emailNotify?: boolean; marketing?: boolean; locale?: string },
): SiteUser | null {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof patch.name === 'string') set.name = patch.name.trim().slice(0, 120);
  if (typeof patch.phone === 'string') set.phone = patch.phone.trim().slice(0, 40);
  if (typeof patch.avatarColor === 'string') set.avatarColor = patch.avatarColor.trim().slice(0, 40);
  if (typeof patch.emailNotify === 'boolean') set.emailNotify = patch.emailNotify;
  if (typeof patch.marketing === 'boolean') set.marketing = patch.marketing;
  if (typeof patch.locale === 'string') set.locale = patch.locale.trim().slice(0, 12);
  getDb().update(siteUsers).set(set).where(and(eq(siteUsers.id, userId), eq(siteUsers.siteId, siteId))).run();
  return getSiteUserById(siteId, userId);
}

/** Change password after verifying the current one. Throws 'WRONG_PASSWORD'. */
export function changeSitePassword(siteId: string, userId: string, current: string, next: string): void {
  const user = getSiteUserById(siteId, userId);
  if (!user) throw new Error('NOT_FOUND');
  if (!verifyPassword(current, user.passwordHash)) throw new Error('WRONG_PASSWORD');
  getDb()
    .update(siteUsers)
    .set({ passwordHash: hashPassword(next), updatedAt: new Date() })
    .where(eq(siteUsers.id, userId))
    .run();
}

export interface SiteSessionRow {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  current: boolean;
}

/** Active (non-expired) sessions of a user, newest activity first; marks the current one. */
export async function listSiteSessions(siteId: string, userId: string): Promise<SiteSessionRow[]> {
  const jar = await cookies();
  const token = jar.get(SITE_SESSION_COOKIE)?.value;
  const currentId = token ? hashToken(token) : '';
  const rows = getDb()
    .select({
      id: siteSessions.id,
      userAgent: siteSessions.userAgent,
      ip: siteSessions.ip,
      createdAt: siteSessions.createdAt,
      lastActiveAt: siteSessions.lastActiveAt,
    })
    .from(siteSessions)
    .where(and(eq(siteSessions.siteUserId, userId), eq(siteSessions.siteId, siteId), gt(siteSessions.expiresAt, new Date())))
    .orderBy(desc(siteSessions.lastActiveAt))
    .all();
  return rows.map((r) => ({ ...r, current: r.id === currentId }));
}

/** Revoke one session (must belong to the user). */
export function revokeSiteSession(siteId: string, userId: string, sessionId: string): void {
  getDb()
    .delete(siteSessions)
    .where(and(eq(siteSessions.id, sessionId), eq(siteSessions.siteUserId, userId), eq(siteSessions.siteId, siteId)))
    .run();
}

/** Revoke every session of the user EXCEPT the current one ("log out everywhere else"). */
export async function revokeOtherSiteSessions(siteId: string, userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SITE_SESSION_COOKIE)?.value;
  const currentId = token ? hashToken(token) : '';
  getDb()
    .delete(siteSessions)
    .where(and(eq(siteSessions.siteUserId, userId), eq(siteSessions.siteId, siteId), ne(siteSessions.id, currentId)))
    .run();
}

/** Permanently delete the account (sessions cascade) and clear the cookie. */
export async function deleteSiteUser(siteId: string, userId: string): Promise<void> {
  getDb().delete(siteUsers).where(and(eq(siteUsers.id, userId), eq(siteUsers.siteId, siteId))).run();
  const jar = await cookies();
  jar.delete(SITE_SESSION_COOKIE);
}

export interface SiteUserSubmission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

/** Requests the user submitted on this site: linked by siteUserId, or matched by
 *  the email stored in the submission payload (covers pre-login submissions). */
export function listSiteUserSubmissions(siteId: string, userId: string, email: string, limit = 100): SiteUserSubmission[] {
  const rows = getDb()
    .select({ id: submissions.id, formId: submissions.formId, data: submissions.data, createdAt: submissions.createdAt })
    .from(submissions)
    .where(
      and(
        eq(submissions.siteId, siteId),
        or(eq(submissions.siteUserId, userId), sql`lower(json_extract(${submissions.data}, '$.email')) = ${normEmail(email)}`),
      ),
    )
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .all();
  return rows.map((r) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(r.data);
    } catch {
      /* ignore */
    }
    return { id: r.id, formId: r.formId, data, createdAt: r.createdAt };
  });
}

export interface SiteUserRow {
  id: string;
  email: string;
  name: string;
  status: string;
  createdAt: Date;
}

/** All end-users registered on a site, newest first (for the owner's dashboard). */
export function listSiteUsers(siteId: string, limit = 500): SiteUserRow[] {
  return getDb()
    .select({ id: siteUsers.id, email: siteUsers.email, name: siteUsers.name, status: siteUsers.status, createdAt: siteUsers.createdAt })
    .from(siteUsers)
    .where(eq(siteUsers.siteId, siteId))
    .orderBy(desc(siteUsers.createdAt))
    .limit(limit)
    .all();
}

export function countSiteUsers(siteId: string): number {
  return listSiteUsers(siteId, 100000).length;
}
