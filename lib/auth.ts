// Self-hosted auth: scrypt password hashes (node:crypto, zero deps) and
// DB-backed sessions. The cookie carries a random bearer token; only its
// sha256 is stored, so a leaked DB cannot be replayed as a session.

import 'server-only';
import { scryptSync, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { getDb, newId, users, sessions, type User } from '@/lib/db';

export const SESSION_COOKIE = 'cwk_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
/** Renew the session when less than this much lifetime remains. */
const SESSION_RENEW_MS = SESSION_TTL_MS / 2;

const SCRYPT = { N: 16384, r: 8, p: 1, keyLen: 64 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT.keyLen, SCRYPT);
  return `scrypt:${SCRYPT.N}:${SCRYPT.r}:${SCRYPT.p}:${salt.toString('base64')}:${key.toString('base64')}`;
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

export function createSession(userId: string): { token: string; expiresAt: Date } {
  const db = getDb();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  db.insert(sessions)
    .values({ id: hashToken(token), userId, expiresAt, createdAt: new Date() })
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
  if (row.session.expiresAt.getTime() - now < SESSION_RENEW_MS) {
    db.update(sessions)
      .set({ expiresAt: new Date(now + SESSION_TTL_MS) })
      .where(eq(sessions.id, id))
      .run();
  }
  return row.user;
}

/** Current user from the request cookie, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? getUserByToken(token) : null;
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
  const user: User = {
    id: newId('u'),
    email: normalizeEmail(email),
    name: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date(),
  };
  db.insert(users).values(user).run();
  return user;
}

export function findUserByEmail(email: string): User | null {
  return getDb().select().from(users).where(eq(users.email, normalizeEmail(email))).get() ?? null;
}

// ---- tiny in-memory rate limiter for the auth endpoints ----
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
