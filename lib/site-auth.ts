import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, desc, eq, gt } from 'drizzle-orm';
import { getDb, newId, siteUsers, siteSessions, type SiteUser } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

// Per-tenant END-USER auth — fully isolated from the platform's own auth
// (lib/auth.ts). Different cookie, different tables, always scoped by siteId so
// one tenant's customers can never be confused with another's or with the
// platform accounts.
export const SITE_SESSION_COOKIE = 'cwk_site';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

/** Create an end-user for a site. Throws 'EMAIL_TAKEN' if the email already
 *  exists ON THIS SITE (the same email is fine on a different site). */
export function createSiteUser(siteId: string, email: string, password: string, name = ''): SiteUser {
  const normalized = normEmail(email);
  if (getSiteUserByEmail(siteId, normalized)) throw new Error('EMAIL_TAKEN');
  const user: SiteUser = {
    id: newId('su'),
    siteId,
    email: normalized,
    name: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date(),
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
export async function createSiteSession(siteUserId: string, siteId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  getDb()
    .insert(siteSessions)
    .values({ id: hashToken(token), siteUserId, siteId, expiresAt: new Date(now + SESSION_TTL_MS), createdAt: new Date(now) })
    .run();
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
  const row = getDb()
    .select({ user: siteUsers })
    .from(siteSessions)
    .innerJoin(siteUsers, eq(siteSessions.siteUserId, siteUsers.id))
    .where(and(eq(siteSessions.id, hashToken(token)), eq(siteSessions.siteId, siteId), gt(siteSessions.expiresAt, new Date())))
    .get();
  return row?.user ?? null;
}

/** Log out the current site end-user: delete the session row + clear cookie. */
export async function destroySiteSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SITE_SESSION_COOKIE)?.value;
  if (token) getDb().delete(siteSessions).where(eq(siteSessions.id, hashToken(token))).run();
  jar.delete(SITE_SESSION_COOKIE);
}

export interface SiteUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/** All end-users registered on a site, newest first (for the owner's dashboard). */
export function listSiteUsers(siteId: string, limit = 500): SiteUserRow[] {
  return getDb()
    .select({ id: siteUsers.id, email: siteUsers.email, name: siteUsers.name, createdAt: siteUsers.createdAt })
    .from(siteUsers)
    .where(eq(siteUsers.siteId, siteId))
    .orderBy(desc(siteUsers.createdAt))
    .limit(limit)
    .all();
}

export function countSiteUsers(siteId: string): number {
  return listSiteUsers(siteId, 100000).length;
}
