// One-time email codes for the platform auth (auth_codes table):
//   - 6-digit login OTP — the second factor emailed on every password login;
//   - long password-reset tokens for the "забыли пароль?" flow.
// Only sha256 hashes are stored; codes are one-shot, short-lived, and OTP
// guesses are capped. Issuing a new code invalidates the previous one.

import 'server-only';
import { randomInt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { getDb, newId, authCodes, users, type User } from '@/lib/db';
import { verifyTotp } from '@/lib/totp';

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 min
export const RESET_TTL_MS = 60 * 60 * 1000; // 60 min
export const MAX_OTP_ATTEMPTS = 5;

export const OTP_TTL_MIN = OTP_TTL_MS / 60_000;
export const RESET_TTL_MIN = RESET_TTL_MS / 60_000;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** "anna@example.com" → "an•••@example.com" — safe to show on the OTP screen. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${head}•••@${domain}`;
}

/** Constant-time hash comparison (both operands are fixed-length sha256 hex). */
function hashEquals(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Drop expired rows so the table never accumulates garbage (best-effort). */
export function cleanupAuthCodes(): void {
  try {
    getDb().delete(authCodes).where(lt(authCodes.expiresAt, new Date())).run();
  } catch {
    /* opportunistic */
  }
}

/** Invalidate every live code of one kind for a user (re-issue = old code dies). */
function invalidateFor(userId: string, purpose: string): void {
  getDb()
    .delete(authCodes)
    .where(and(eq(authCodes.userId, userId), eq(authCodes.purpose, purpose)))
    .run();
}

// ── Login OTP (6 digits) ────────────────────────────────────────────────────

/** Issue a fresh 6-digit login code. Returns the challenge id (safe to hand to
 *  the client) and the raw code (goes into the email, never into the DB). */
export function createLoginOtp(user: Pick<User, 'id' | 'email'>): { challengeId: string; code: string } {
  cleanupAuthCodes();
  invalidateFor(user.id, 'login_otp');
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const challengeId = newId('otp');
  getDb()
    .insert(authCodes)
    .values({
      id: challengeId,
      userId: user.id,
      email: user.email,
      purpose: 'login_otp',
      codeHash: sha256(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      consumedAt: null,
      createdAt: new Date(),
    })
    .run();
  return { challengeId, code };
}

/** Issue a registration-verification code. The account remains inactive until
 * the code is successfully redeemed. */
export function createRegistrationOtp(user: Pick<User, 'id' | 'email'>): { challengeId: string; code: string } {
  cleanupAuthCodes();
  invalidateFor(user.id, 'registration_otp');
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const challengeId = newId('reg');
  getDb()
    .insert(authCodes)
    .values({
      id: challengeId,
      userId: user.id,
      email: user.email,
      purpose: 'registration_otp',
      codeHash: sha256(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      consumedAt: null,
      createdAt: new Date(),
    })
    .run();
  return { challengeId, code };
}

/** Verify a registration code. Kept separate so login challenges cannot activate accounts. */
export function verifyRegistrationOtp(challengeId: string, code: string): OtpVerdict {
  const db = getDb();
  const row = db.select().from(authCodes).where(eq(authCodes.id, challengeId)).get();
  if (!row || row.purpose !== 'registration_otp' || row.consumedAt) return { status: 'expired' };
  if (row.expiresAt.getTime() < Date.now()) return { status: 'expired' };
  if (row.attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };
  if (!/^\d{6}$/.test(code) || !hashEquals(sha256(code), row.codeHash)) {
    const attempts = row.attempts + 1;
    db.update(authCodes).set({ attempts }).where(eq(authCodes.id, row.id)).run();
    return attempts >= MAX_OTP_ATTEMPTS ? { status: 'too_many' } : { status: 'invalid', attemptsLeft: MAX_OTP_ATTEMPTS - attempts };
  }
  db.update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, row.id)).run();
  return { status: 'ok', userId: row.userId };
}

export type OtpVerdict =
  | { status: 'ok'; userId: string }
  | { status: 'invalid'; attemptsLeft: number }
  | { status: 'expired' }
  | { status: 'too_many' };

/** Check a submitted 6-digit code against a challenge. One success consumes it. */
export function verifyLoginOtp(challengeId: string, code: string): OtpVerdict {
  const db = getDb();
  const row = db.select().from(authCodes).where(eq(authCodes.id, challengeId)).get();
  if (!row || row.purpose !== 'login_otp' || row.consumedAt) return { status: 'expired' };
  if (row.expiresAt.getTime() < Date.now()) return { status: 'expired' };
  if (row.attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };

  if (!/^\d{6}$/.test(code) || !hashEquals(sha256(code), row.codeHash)) {
    const attempts = row.attempts + 1;
    db.update(authCodes).set({ attempts }).where(eq(authCodes.id, challengeId)).run();
    if (attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };
    return { status: 'invalid', attemptsLeft: MAX_OTP_ATTEMPTS - attempts };
  }

  db.update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, challengeId)).run();
  return { status: 'ok', userId: row.userId };
}

/** The user behind a live (unconsumed, unexpired) challenge — for resends. */
export function challengeUser(challengeId: string): User | null {
  const db = getDb();
  const row = db
    .select({ user: users })
    .from(authCodes)
    .innerJoin(users, eq(authCodes.userId, users.id))
    .where(and(eq(authCodes.id, challengeId), eq(authCodes.purpose, 'login_otp'), isNull(authCodes.consumedAt)))
    .get();
  return row?.user ?? null;
}

// ── TOTP login challenge (authenticator app replaces the emailed code) ───────

/** Issue a pending-login challenge satisfied by a TOTP code. No code is stored;
 *  verification runs against the user's TOTP secret at verify time. */
export function createTotpChallenge(user: Pick<User, 'id' | 'email'>): { challengeId: string } {
  cleanupAuthCodes();
  invalidateFor(user.id, 'totp_login');
  const challengeId = newId('totp');
  getDb()
    .insert(authCodes)
    .values({
      id: challengeId,
      userId: user.id,
      email: user.email,
      purpose: 'totp_login',
      codeHash: '',
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      consumedAt: null,
      createdAt: new Date(),
    })
    .run();
  return { challengeId };
}

/** Purpose + user of a live (unconsumed, unexpired) challenge, or null. */
export function getChallenge(challengeId: string): { userId: string; purpose: string } | null {
  const row = getDb().select().from(authCodes).where(eq(authCodes.id, challengeId)).get();
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) return null;
  return { userId: row.userId, purpose: row.purpose };
}

/** Verify a TOTP code against a challenge; consumes on success, caps attempts. */
export function verifyTotpLogin(challengeId: string, code: string, secret: string | null): OtpVerdict {
  const db = getDb();
  const row = db.select().from(authCodes).where(eq(authCodes.id, challengeId)).get();
  if (!row || row.purpose !== 'totp_login' || row.consumedAt) return { status: 'expired' };
  if (row.expiresAt.getTime() < Date.now()) return { status: 'expired' };
  if (row.attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };
  if (!secret || !verifyTotp(secret, (code ?? '').trim())) {
    const attempts = row.attempts + 1;
    db.update(authCodes).set({ attempts }).where(eq(authCodes.id, challengeId)).run();
    if (attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };
    return { status: 'invalid', attemptsLeft: MAX_OTP_ATTEMPTS - attempts };
  }
  db.update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, challengeId)).run();
  return { status: 'ok', userId: row.userId };
}

// ── Password reset (long token) ─────────────────────────────────────────────

/** Issue a password-reset token (goes into the emailed link, hash into the DB). */
export function createPasswordReset(user: Pick<User, 'id' | 'email'>): { token: string } {
  cleanupAuthCodes();
  invalidateFor(user.id, 'password_reset');
  const token = randomBytes(32).toString('base64url');
  getDb()
    .insert(authCodes)
    .values({
      id: newId('rst'),
      userId: user.id,
      email: user.email,
      purpose: 'password_reset',
      codeHash: sha256(token),
      attempts: 0,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
      consumedAt: null,
      createdAt: new Date(),
    })
    .run();
  return { token };
}

function findReset(token: string) {
  if (!token) return null;
  const row = getDb()
    .select()
    .from(authCodes)
    .where(and(eq(authCodes.codeHash, sha256(token)), eq(authCodes.purpose, 'password_reset')))
    .get();
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Is this reset token still usable? (Read-only — for rendering the form.) */
export function peekPasswordReset(token: string): boolean {
  return findReset(token) !== null;
}

/** Burn a reset token and return its user id, or null when invalid/expired/used. */
export function consumePasswordReset(token: string): string | null {
  const row = findReset(token);
  if (!row) return null;
  getDb().update(authCodes).set({ consumedAt: new Date() }).where(eq(authCodes.id, row.id)).run();
  return row.userId;
}
