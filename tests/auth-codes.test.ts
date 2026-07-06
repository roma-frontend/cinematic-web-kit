import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { resetDb } from './helpers';
import { createUser } from '@/lib/auth';
import { getDb, authCodes } from '@/lib/db';
import {
  createLoginOtp,
  verifyLoginOtp,
  challengeUser,
  createPasswordReset,
  peekPasswordReset,
  consumePasswordReset,
  cleanupAuthCodes,
  maskEmail,
  MAX_OTP_ATTEMPTS,
} from '@/lib/auth-codes';

beforeEach(() => resetDb());

const makeUser = () => createUser('otp@example.com', 'password123', 'Отп Тестов');

function expireRow(id: string) {
  getDb()
    .update(authCodes)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(authCodes.id, id))
    .run();
}

describe('login OTP', () => {
  it('issues a 6-digit code and stores only its hash', () => {
    const user = makeUser();
    const { challengeId, code } = createLoginOtp(user);
    expect(code).toMatch(/^\d{6}$/);
    const row = getDb().select().from(authCodes).where(eq(authCodes.id, challengeId)).get()!;
    expect(row.purpose).toBe('login_otp');
    expect(row.codeHash).not.toContain(code);
    expect(row.consumedAt).toBeNull();
  });

  it('verifies the right code exactly once', () => {
    const user = makeUser();
    const { challengeId, code } = createLoginOtp(user);
    expect(verifyLoginOtp(challengeId, code)).toEqual({ status: 'ok', userId: user.id });
    // one-shot: the same code cannot create a second session
    expect(verifyLoginOtp(challengeId, code)).toEqual({ status: 'expired' });
  });

  it('counts wrong guesses and dies after MAX_OTP_ATTEMPTS', () => {
    const user = makeUser();
    const { challengeId, code } = createLoginOtp(user);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 1; i < MAX_OTP_ATTEMPTS; i++) {
      const v = verifyLoginOtp(challengeId, wrong);
      expect(v).toEqual({ status: 'invalid', attemptsLeft: MAX_OTP_ATTEMPTS - i });
    }
    expect(verifyLoginOtp(challengeId, wrong)).toEqual({ status: 'too_many' });
    // even the correct code is refused after the cap
    expect(verifyLoginOtp(challengeId, code)).toEqual({ status: 'too_many' });
  });

  it('rejects expired and unknown challenges', () => {
    const user = makeUser();
    const { challengeId, code } = createLoginOtp(user);
    expireRow(challengeId);
    expect(verifyLoginOtp(challengeId, code)).toEqual({ status: 'expired' });
    expect(verifyLoginOtp('otp_nonexistent', '123456')).toEqual({ status: 'expired' });
  });

  it('re-issuing kills the previous code', () => {
    const user = makeUser();
    const first = createLoginOtp(user);
    const second = createLoginOtp(user);
    expect(verifyLoginOtp(first.challengeId, first.code)).toEqual({ status: 'expired' });
    expect(verifyLoginOtp(second.challengeId, second.code)).toEqual({ status: 'ok', userId: user.id });
  });

  it('challengeUser resolves the pending user and ignores consumed challenges', () => {
    const user = makeUser();
    const { challengeId, code } = createLoginOtp(user);
    expect(challengeUser(challengeId)?.id).toBe(user.id);
    verifyLoginOtp(challengeId, code);
    expect(challengeUser(challengeId)).toBeNull();
    expect(challengeUser('otp_missing')).toBeNull();
  });
});

describe('password reset', () => {
  it('issues a long one-shot token', () => {
    const user = makeUser();
    const { token } = createPasswordReset(user);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(peekPasswordReset(token)).toBe(true);
    expect(consumePasswordReset(token)).toBe(user.id);
    // burned: neither peek nor a second consume works
    expect(peekPasswordReset(token)).toBe(false);
    expect(consumePasswordReset(token)).toBeNull();
  });

  it('rejects garbage and expired tokens', () => {
    const user = makeUser();
    const { token } = createPasswordReset(user);
    expect(consumePasswordReset('not-a-token')).toBeNull();
    expect(consumePasswordReset('')).toBeNull();
    const row = getDb().select().from(authCodes).all()[0];
    expireRow(row.id);
    expect(consumePasswordReset(token)).toBeNull();
    void user;
  });

  it('a new request invalidates the previous token', () => {
    const user = makeUser();
    const first = createPasswordReset(user);
    const second = createPasswordReset(user);
    expect(consumePasswordReset(first.token)).toBeNull();
    expect(consumePasswordReset(second.token)).toBe(user.id);
  });
});

describe('cleanupAuthCodes', () => {
  it('drops expired rows and keeps live ones', () => {
    const user = makeUser();
    const dead = createLoginOtp(user);
    void dead;
    const row = getDb().select().from(authCodes).all()[0];
    expireRow(row.id);
    const live = createPasswordReset(user); // create runs cleanup too, but call explicitly:
    cleanupAuthCodes();
    const left = getDb().select().from(authCodes).all();
    expect(left).toHaveLength(1);
    expect(left[0].purpose).toBe('password_reset');
    expect(consumePasswordReset(live.token)).toBe(user.id);
  });
});

describe('maskEmail', () => {
  it('keeps a short prefix and the domain', () => {
    expect(maskEmail('anna@example.com')).toBe('an•••@example.com');
    expect(maskEmail('ab@x.io')).toBe('a•••@x.io');
    expect(maskEmail('nodomain')).toBe('nodomain');
  });
});
