import { describe, it, expect, beforeEach, vi } from 'vitest';

// A minimal in-memory cookie jar standing in for Next's cookies().
const store = new Map<string, string>();
const jar = {
  get: (k: string) => (store.has(k) ? { name: k, value: store.get(k)! } : undefined),
  set: (k: string, v: string) => void store.set(k, v),
  delete: (k: string) => void store.delete(k),
};
vi.mock('next/headers', () => ({ cookies: async () => jar }));

import {
  createUser,
  createSession,
  getCurrentUser,
  getSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getUserByToken,
  requestMeta,
  SESSION_COOKIE,
} from '@/lib/auth';
import { getDb, sessions, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { resetDb } from './helpers';

const tokenId = (token: string) => createHash('sha256').update(token).digest('hex');

beforeEach(() => {
  resetDb();
  store.clear();
});

describe('requestMeta', () => {
  it('extracts UA and first x-forwarded-for IP', () => {
    const req = new Request('https://x.test', {
      headers: { 'user-agent': 'UA/1', 'x-forwarded-for': '9.9.9.9, 1.1.1.1' },
    });
    expect(requestMeta(req)).toEqual({ userAgent: 'UA/1', ip: '9.9.9.9' });
  });

  it('falls back to local ip and empty UA', () => {
    const req = new Request('https://x.test');
    expect(requestMeta(req)).toEqual({ userAgent: '', ip: 'local' });
  });
});

describe('cookie-backed session helpers', () => {
  it('setSessionCookie + getCurrentUser + getSessionToken round-trip', async () => {
    const u = createUser('c@example.com', 'password123', 'C');
    const { token, expiresAt } = createSession(u.id);
    await setSessionCookie(token, expiresAt);
    expect(store.get(SESSION_COOKIE)).toBe(token);
    expect(await getSessionToken()).toBe(token);
    const me = await getCurrentUser();
    expect(me?.id).toBe(u.id);
  });

  it('returns null user when no cookie is present', async () => {
    expect(await getCurrentUser()).toBeNull();
    expect(await getSessionToken()).toBeUndefined();
  });

  it('clearSessionCookie destroys the session and removes the cookie', async () => {
    const u = createUser('d@example.com', 'password123', 'D');
    const { token, expiresAt } = createSession(u.id);
    await setSessionCookie(token, expiresAt);
    await clearSessionCookie();
    expect(store.has(SESSION_COOKIE)).toBe(false);
    expect(getUserByToken(token)).toBeNull();
  });
});

describe('getUserByToken edge branches', () => {
  it('deletes and rejects an expired session', () => {
    const u = createUser('e@example.com', 'password123', 'E');
    const { token } = createSession(u.id);
    const id = tokenId(token);
    getDb().update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, id)).run();
    expect(getUserByToken(token)).toBeNull();
  });

  it('rejects a valid session for a suspended (inactive) user', () => {
    const u = createUser('f@example.com', 'password123', 'F');
    const { token } = createSession(u.id);
    getDb().update(users).set({ isActive: false }).where(eq(users.id, u.id)).run();
    expect(getUserByToken(token)).toBeNull();
  });

  it('renews a session close to expiry', () => {
    const u = createUser('g@example.com', 'password123', 'G');
    const { token } = createSession(u.id);
    const id = tokenId(token);
    // Force it near expiry so the sliding-renewal branch runs.
    getDb().update(sessions).set({ expiresAt: new Date(Date.now() + 60_000) }).where(eq(sessions.id, id)).run();
    expect(getUserByToken(token)?.id).toBe(u.id);
    const after = getDb().select().from(sessions).where(eq(sessions.id, id)).get();
    expect(after!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 60_000);
  });
});
