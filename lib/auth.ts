// Self-hosted auth: scrypt password hashes (node:crypto, zero deps) and
// DB-backed sessions. The cookie carries a random bearer token; only its
// sha256 is stored, so a leaked DB cannot be replayed as a session.

import 'server-only';
import { scryptSync, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb, newId, users, sessions, type User, type Role } from '@/lib/db';

export const SESSION_COOKIE = 'cwk_session';
/** Holds the superadmin's own token while they impersonate another user. */
export const ADMIN_RETURN_COOKIE = 'cwk_admin_return';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Renew the session when less than this much lifetime remains. */
const SESSION_RENEW_MS = SESSION_TTL_MS / 2;

const SCRYPT = { N: 16384, r: 8, p: 1, keyLen: 64 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT.keyLen, SCRYPT);
  return `scrypt:${SCRYPT.N}:${SCRYPT.r}:${SCRYPT.p}:${salt.toString('base64')}:${key.toString('base64')}`;
}

// Ambiguous glyphs (0/O, 1/l/I) are excluded so a temporary password can be
// safely read aloud or typed from a screen.
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * Cryptographically-random, human-friendly password for superadmin-issued
 * temporary credentials. Grouped as XXXX-XXXX-XXXX for readability.
 */
export function generatePassword(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => PW_ALPHABET[b % PW_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, N, r, p, saltB64, keyB64] = stored.split(':');
    if (algo !== 'scrypt') return false;
    const expected = Buffer.from(keyB64, 'base64');
    const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Bump the presence heartbeat at most this often to avoid a write per request. */
const PRESENCE_THROTTLE_MS = 60 * 1000;

export interface SessionMeta { userAgent?: string; ip?: string }

/** Device/IP metadata from an incoming request, for session fingerprinting. */
export function requestMeta(request: Request): SessionMeta {
  return {
    userAgent: (request.headers.get('user-agent') ?? '').slice(0, 400),
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local',
  };
}

export function createSession(userId: string, meta: SessionMeta = {}): { token: string; expiresAt: Date } {
  const db = getDb();
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  db.insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      expiresAt,
      createdAt: now,
      lastActiveAt: now,
      userAgent: meta.userAgent ?? '',
      ip: meta.ip ?? '',
    })
    .run();
  return { token, expiresAt };
}

export function destroySession(token: string): void {
  getDb().delete(sessions).where(eq(sessions.id, hashToken(token))).run();
}

/** Validate a raw token → user, with sliding expiry renewal. */
export function getUserByToken(token: string): User | null {
  if (!token) return null;
  const db = getDb();
  const id = hashToken(token);
  const row = db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;
  const now = Date.now();
  if (row.session.expiresAt.getTime() < now) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  // A suspended user is locked out immediately, even with a valid session.
  if (!row.user.isActive) return null;
  if (row.session.expiresAt.getTime() - now < SESSION_RENEW_MS) {
    db.update(sessions)
      .set({ expiresAt: new Date(now + SESSION_TTL_MS) })
      .where(eq(sessions.id, id))
      .run();
  }
  const seen = row.session.lastActiveAt?.getTime() ?? 0;
  if (now - seen > PRESENCE_THROTTLE_MS) {
    db.update(sessions).set({ lastActiveAt: new Date(now) }).where(eq(sessions.id, id)).run();
  }
  return row.user;
}

/** Current user from the request cookie, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? getUserByToken(token) : null;
}

/** Minimal user shape the SiteHeader needs, resolved on the server so the top
 *  bar renders the correct nav/actions immediately (no client flash). Returns
 *  null for guests. */
export async function getHeaderUser(): Promise<{ name: string; email: string; role: Role } | null> {
  const u = await getCurrentUser();
  return u ? { name: u.name, email: u.email, role: u.role as Role } : null;
}

/** Raw session token from the request cookie (needed to stash it during impersonation). */
export async function getSessionToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

/** Expiry of an existing session by its raw token, or null if unknown. */
export function getSessionExpiry(token: string): Date | null {
  if (!token) return null;
  const row = getDb().select({ expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.id, hashToken(token))).get();
  return row?.expiresAt ?? null;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  jar.delete(SESSION_COOKIE);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUser(email: string, password: string, name: string): User {
  const db = getDb();
  // The very first account becomes the superadmin (bootstrap the owner).
  const existing = db.select({ id: users.id }).from(users).limit(1).get();
  const role: Role = existing ? 'customer' : 'superadmin';
  const user: User = {
    id: newId('u'),
    email: normalizeEmail(email),
    name: name.trim(),
    passwordHash: hashPassword(password),
    role,
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    totpSecret: null,
    totpEnabled: false,
    mustChangePassword: false,
    telegramId: null,
    telegramUsername: null,
    googleId: null,
    appleId: null,
    createdAt: new Date(),
  };
  db.insert(users).values(user).run();
  return user;
}

/** Staff = admin or superadmin (can access the admin sections). */
export function isStaff(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'superadmin';
}

export function isSuperadmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'superadmin';
}

export function findUserByEmail(email: string): User | null {
  return getDb().select().from(users).where(eq(users.email, normalizeEmail(email))).get() ?? null;
}

// ---- brute-force account lockout (mirrors hr-project: 5 fails → 15 min) ----
export const MAX_LOGIN_FAILURES = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** A scrypt hash of nothing in particular — verified against when the account
 *  doesn't exist, so both branches cost the same (no enumeration timing oracle). */
export const DUMMY_HASH = 'scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA==:AA==';

/** Milliseconds until the account unlocks, or 0 when not locked. */
export function lockRemainingMs(user: { lockedUntil: Date | null }): number {
  const until = user.lockedUntil?.getTime() ?? 0;
  return until > Date.now() ? until - Date.now() : 0;
}

/** Count a failed login; lock the account when the threshold is reached.
 *  Returns true when this failure triggered a lockout. */
export function recordLoginFailure(user: { id: string; failedAttempts: number }): boolean {
  const failures = user.failedAttempts + 1;
  const locked = failures >= MAX_LOGIN_FAILURES;
  getDb()
    .update(users)
    .set(locked ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : { failedAttempts: failures })
    .where(eq(users.id, user.id))
    .run();
  return locked;
}

export function clearLoginFailures(user: { id: string; failedAttempts: number; lockedUntil: Date | null }): void {
  if (user.failedAttempts === 0 && !user.lockedUntil) return;
  getDb().update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id)).run();
}

// ---- tiny in-memory rate limiter for the auth endpoints ----
// NOTE: in-memory (Map) → only effective on a SINGLE instance. On multi-replica
// or serverless deployments each instance keeps its own counters, so the
// effective limit is multiplied by the number of instances and resets on cold
// starts. For horizontally-scaled production, back this with Redis/Upstash.
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max = 10, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const cur = attempts.get(key);
  if (!cur || cur.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  cur.count += 1;
  if (attempts.size > 10_000) attempts.clear(); // memory backstop
  return cur.count <= max;
}
