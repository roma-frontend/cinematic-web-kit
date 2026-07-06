// One-time email codes for the per-tenant END-USER auth (site_auth_codes table),
// a faithful mirror of lib/auth-codes.ts but scoped to `site_users`:
//   - 6-digit login OTP — the second factor emailed on every password login;
//   - long password-reset tokens for the tenant "forgot password" flow.
// Only sha256 hashes are stored; codes are one-shot, short-lived, and OTP
// guesses are capped. Issuing a new code invalidates the previous one. Every
// row carries siteId so one tenant's codes can never cross to another.

import 'server-only';
import { randomInt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { getDb, newId, siteAuthCodes, siteUsers, type SiteUser } from '@/lib/db';
// Reuse the platform constants + email masking (no duplication).
export { OTP_TTL_MS, RESET_TTL_MS, MAX_OTP_ATTEMPTS, OTP_TTL_MIN, RESET_TTL_MIN, maskEmail } from '@/lib/auth-codes';
import { OTP_TTL_MS, RESET_TTL_MS, MAX_OTP_ATTEMPTS } from '@/lib/auth-codes';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Constant-time hash comparison (both operands are fixed-length sha256 hex). */
function hashEquals(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Drop expired rows so the table never accumulates garbage (best-effort). */
export function cleanupSiteAuthCodes(): void {
  try {
    getDb().delete(siteAuthCodes).where(lt(siteAuthCodes.expiresAt, new Date())).run();
  } catch {
    /* opportunistic */
  }
}

/** Invalidate every live code of one kind for a site user (re-issue = old code dies). */
function invalidateFor(siteUserId: string, purpose: string): void {
  getDb()
    .delete(siteAuthCodes)
    .where(and(eq(siteAuthCodes.siteUserId, siteUserId), eq(siteAuthCodes.purpose, purpose)))
    .run();
}

// ── Login OTP (6 digits) ────────────────────────────────────────────────────

/** Issue a fresh 6-digit login code. Returns the challenge id (safe to hand to
 *  the client) and the raw code (goes into the email, never into the DB). */
export function createSiteLoginOtp(user: { id: string; email: string; siteId: string }): { challengeId: string; code: string } {
  cleanupSiteAuthCodes();
  invalidateFor(user.id, 'login_otp');
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const challengeId = newId('sotp');
  getDb()
    .insert(siteAuthCodes)
    .values({
      id: challengeId,
      siteUserId: user.id,
      siteId: user.siteId,
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

export type SiteOtpVerdict =
  | { status: 'ok'; siteUserId: string; siteId: string }
  | { status: 'invalid'; attemptsLeft: number }
  | { status: 'expired' }
  | { status: 'too_many' };

/** Check a submitted 6-digit code against a challenge. One success consumes it. */
export function verifySiteLoginOtp(challengeId: string, code: string): SiteOtpVerdict {
  const db = getDb();
  const row = db.select().from(siteAuthCodes).where(eq(siteAuthCodes.id, challengeId)).get();
  if (!row || row.purpose !== 'login_otp' || row.consumedAt) return { status: 'expired' };
  if (row.expiresAt.getTime() < Date.now()) return { status: 'expired' };
  if (row.attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };

  if (!/^\d{6}$/.test(code) || !hashEquals(sha256(code), row.codeHash)) {
    const attempts = row.attempts + 1;
    db.update(siteAuthCodes).set({ attempts }).where(eq(siteAuthCodes.id, challengeId)).run();
    if (attempts >= MAX_OTP_ATTEMPTS) return { status: 'too_many' };
    return { status: 'invalid', attemptsLeft: MAX_OTP_ATTEMPTS - attempts };
  }

  db.update(siteAuthCodes).set({ consumedAt: new Date() }).where(eq(siteAuthCodes.id, challengeId)).run();
  return { status: 'ok', siteUserId: row.siteUserId, siteId: row.siteId };
}

/** The site user behind a live (unconsumed, unexpired) challenge — for resends. */
export function siteChallengeUser(challengeId: string): SiteUser | null {
  const db = getDb();
  const row = db
    .select({ user: siteUsers })
    .from(siteAuthCodes)
    .innerJoin(siteUsers, eq(siteAuthCodes.siteUserId, siteUsers.id))
    .where(and(eq(siteAuthCodes.id, challengeId), eq(siteAuthCodes.purpose, 'login_otp'), isNull(siteAuthCodes.consumedAt)))
    .get();
  return row?.user ?? null;
}

// ── Password reset (long token) ─────────────────────────────────────────────

/** Issue a password-reset token (goes into the emailed link, hash into the DB). */
export function createSitePasswordReset(user: { id: string; email: string; siteId: string }): { token: string } {
  cleanupSiteAuthCodes();
  invalidateFor(user.id, 'password_reset');
  const token = randomBytes(32).toString('base64url');
  getDb()
    .insert(siteAuthCodes)
    .values({
      id: newId('srst'),
      siteUserId: user.id,
      siteId: user.siteId,
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
    .from(siteAuthCodes)
    .where(and(eq(siteAuthCodes.codeHash, sha256(token)), eq(siteAuthCodes.purpose, 'password_reset')))
    .get();
  if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Is this reset token still usable? (Read-only — for rendering the form.) */
export function peekSitePasswordReset(token: string): boolean {
  return findReset(token) !== null;
}

/** Burn a reset token and return its site user id + site id, or null when invalid. */
export function consumeSitePasswordReset(token: string): { siteUserId: string; siteId: string } | null {
  const row = findReset(token);
  if (!row) return null;
  getDb().update(siteAuthCodes).set({ consumedAt: new Date() }).where(eq(siteAuthCodes.id, row.id)).run();
  return { siteUserId: row.siteUserId, siteId: row.siteId };
}
