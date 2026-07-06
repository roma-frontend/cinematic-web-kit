import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// A minimal in-memory cookie jar standing in for Next's cookies().
const store = new Map<string, string>();
const jar = {
  get: (k: string) => (store.has(k) ? { name: k, value: store.get(k)! } : undefined),
  set: (k: string, v: string) => void store.set(k, v),
  delete: (k: string) => void store.delete(k),
};
vi.mock('next/headers', () => ({ cookies: async () => jar }));

import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as verifyRoute } from '@/app/api/auth/login/verify/route';
import { POST as resendRoute } from '@/app/api/auth/login/resend/route';
import { POST as forgotRoute } from '@/app/api/auth/forgot/route';
import { POST as resetRoute } from '@/app/api/auth/reset/route';
import { createUser, createSession, verifyPassword, SESSION_COOKIE } from '@/lib/auth';
import { createLoginOtp, createPasswordReset, verifyLoginOtp, MAX_OTP_ATTEMPTS } from '@/lib/auth-codes';
import { getDb, users, sessions, authCodes } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { resetDb } from './helpers';

const OLD_ENV = { ...process.env };
let log: ReturnType<typeof vi.spyOn>;

// The in-memory rate limiter lives for the whole test file, so every test
// talks from its own IP (and uses its own email) unless it tests the limiter.
let ipSeq = 0;
const freshIp = () => `10.9.${ipSeq >> 8}.${ipSeq++ & 255}`;

function post(body: unknown, ip: string = freshIp()): Request {
  return new Request('http://test.local/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** Everything the console email transport printed so far, joined. */
const printed = () => log.mock.calls.map((c) => String(c[0])).join('\n');

beforeEach(() => {
  resetDb();
  store.clear();
  delete process.env.RESEND_API_KEY;
  delete process.env.BREVO_API_KEY;
  delete process.env.AUTH_EMAIL_OTP;
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const makeUser = (email = `u${ipSeq}@example.com`) => createUser(email, 'password123', 'Роут Тестов');

describe('POST /api/auth/login (OTP branch)', () => {
  it('logs in directly with a session cookie when no email provider is configured', async () => {
    const u = makeUser();
    const res = await loginRoute(post({ email: u.email, password: 'password123' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.otpRequired).toBeUndefined();
    expect(body.user.email).toBe(u.email);
    expect(store.has(SESSION_COOKIE)).toBe(true);
  });

  it('returns an OTP challenge (and no session) when a provider is configured', async () => {
    process.env.RESEND_API_KEY = 'k';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const u = makeUser();
    const res = await loginRoute(post({ email: u.email, password: 'password123' }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, otpRequired: true });
    expect(body.challenge).toMatch(/^otp_/);
    expect(body.email).toContain('•••@'); // masked, never the raw address
    expect(store.has(SESSION_COOKIE)).toBe(false);
    const row = getDb().select().from(authCodes).where(eq(authCodes.userId, u.id)).get();
    expect(row?.purpose).toBe('login_otp');
  });

  it('falls back to a direct login when the email provider is down', async () => {
    process.env.RESEND_API_KEY = 'k';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('smtp down')));
    const u = makeUser();
    const res = await loginRoute(post({ email: u.email, password: 'password123' }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.otpRequired).toBeUndefined();
    expect(store.has(SESSION_COOKIE)).toBe(true);
  });

  it('rejects a wrong password and malformed JSON', async () => {
    const u = makeUser();
    expect((await loginRoute(post({ email: u.email, password: 'nope-nope' }))).status).toBe(401);
    expect((await loginRoute(post('not json'))).status).toBe(400);
    expect(store.has(SESSION_COOKIE)).toBe(false);
  });
});

describe('POST /api/auth/login/verify', () => {
  it('exchanges a correct code for a session', async () => {
    const u = makeUser();
    const { challengeId, code } = createLoginOtp(u);
    const res = await verifyRoute(post({ challenge: challengeId, code }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(u.id);
    expect(store.has(SESSION_COOKIE)).toBe(true);
    expect(getDb().select().from(sessions).where(eq(sessions.userId, u.id)).all()).toHaveLength(1);
  });

  it('counts wrong codes, reports attempts left, then locks the challenge', async () => {
    const u = makeUser();
    const { challengeId, code } = createLoginOtp(u);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 1; i < MAX_OTP_ATTEMPTS; i++) {
      const res = await verifyRoute(post({ challenge: challengeId, code: wrong }));
      expect(res.status).toBe(401);
      expect((await res.json()).error).toContain(`${MAX_OTP_ATTEMPTS - i}`);
    }
    expect((await verifyRoute(post({ challenge: challengeId, code: wrong }))).status).toBe(429);
    // even the right code is dead now
    expect((await verifyRoute(post({ challenge: challengeId, code }))).status).toBe(429);
    expect(store.has(SESSION_COOKIE)).toBe(false);
  });

  it('rejects unknown challenges and malformed JSON', async () => {
    expect((await verifyRoute(post({ challenge: 'otp_missing', code: '123456' }))).status).toBe(401);
    expect((await verifyRoute(post('not json'))).status).toBe(400);
  });

  it('refuses a session for a user suspended after the code was issued', async () => {
    const u = makeUser();
    const { challengeId, code } = createLoginOtp(u);
    getDb().update(users).set({ isActive: false }).where(eq(users.id, u.id)).run();
    const res = await verifyRoute(post({ challenge: challengeId, code }));
    expect(res.status).toBe(403);
    expect(store.has(SESSION_COOKIE)).toBe(false);
  });
});

describe('POST /api/auth/login/resend', () => {
  it('issues a fresh code, kills the old one, and the new code logs in', async () => {
    const u = makeUser();
    const first = createLoginOtp(u);
    const res = await resendRoute(post({ challenge: first.challengeId }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenge).toMatch(/^otp_/);
    expect(body.challenge).not.toBe(first.challengeId);
    // the old pair is dead
    expect(verifyLoginOtp(first.challengeId, first.code)).toEqual({ status: 'expired' });
    // the new code arrived via the console transport — fish it out and use it
    const code = printed().match(/Ваш код: (\d{6})/)?.[1];
    expect(code).toBeTruthy();
    expect(verifyLoginOtp(body.challenge, code!)).toEqual({ status: 'ok', userId: u.id });
  });

  it('rejects an unknown or already-consumed challenge', async () => {
    const u = makeUser();
    const { challengeId, code } = createLoginOtp(u);
    verifyLoginOtp(challengeId, code); // consume
    expect((await resendRoute(post({ challenge: challengeId }))).status).toBe(401);
    expect((await resendRoute(post({ challenge: 'otp_missing' }))).status).toBe(401);
  });

  it('returns 502 when the email cannot be sent', async () => {
    process.env.RESEND_API_KEY = 'k';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const u = makeUser();
    const { challengeId } = createLoginOtp(u);
    expect((await resendRoute(post({ challenge: challengeId }))).status).toBe(502);
  });
});

describe('POST /api/auth/forgot + /api/auth/reset (full flow)', () => {
  it('emails a reset link that sets a new password, revokes sessions and clears lockout', async () => {
    const u = makeUser();
    createSession(u.id);
    getDb().update(users).set({ failedAttempts: 3, lockedUntil: new Date(Date.now() + 60_000) }).where(eq(users.id, u.id)).run();

    const res = await forgotRoute(post({ email: u.email }));
    expect(await res.json()).toEqual({ ok: true });
    const token = printed().match(/reset-password\?token=([\w-]+)/)?.[1];
    expect(token).toBeTruthy();

    const reset = await resetRoute(post({ token, password: 'brand-new-pass' }));
    expect(reset.status).toBe(200);

    const after = getDb().select().from(users).where(eq(users.id, u.id)).get()!;
    expect(verifyPassword('brand-new-pass', after.passwordHash)).toBe(true);
    expect(after.failedAttempts).toBe(0);
    expect(after.lockedUntil).toBeNull();
    expect(getDb().select().from(sessions).where(eq(sessions.userId, u.id)).all()).toHaveLength(0);

    // the link is one-shot
    expect((await resetRoute(post({ token, password: 'brand-new-pass' }))).status).toBe(400);
  });

  it('answers identically for an unknown email and sends nothing', async () => {
    const res = await forgotRoute(post({ email: 'ghost@example.com' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(log).not.toHaveBeenCalled();
    expect(getDb().select().from(authCodes).all()).toHaveLength(0);
  });

  it('rejects a malformed email and malformed JSON', async () => {
    expect((await forgotRoute(post({ email: 'not-an-email' }))).status).toBe(400);
    expect((await forgotRoute(post('not json'))).status).toBe(400);
  });

  it('throttles per address: after 3 requests further emails are silently dropped', async () => {
    const u = makeUser('throttle@example.com');
    for (let i = 0; i < 5; i++) {
      const res = await forgotRoute(post({ email: u.email }));
      expect(await res.json()).toEqual({ ok: true }); // shape never changes
    }
    expect(log).toHaveBeenCalledTimes(3); // but only 3 emails went out
  });

  it('rate-limits by IP with a 429', async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) {
      await forgotRoute(post({ email: `rl${i}@example.com` }, ip));
    }
    expect((await forgotRoute(post({ email: 'rl-final@example.com' }, ip))).status).toBe(429);
  });

  it('reset validates password length and token', async () => {
    const u = makeUser();
    const { token } = createPasswordReset(u);
    expect((await resetRoute(post({ token, password: 'short' }))).status).toBe(400);
    expect((await resetRoute(post({ token, password: 'x'.repeat(201) }))).status).toBe(400);
    expect((await resetRoute(post({ token: 'garbage', password: 'long-enough-pass' }))).status).toBe(400);
    // the real token survived the failed attempts above
    expect((await resetRoute(post({ token, password: 'long-enough-pass' }))).status).toBe(200);
  });
});
