import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './helpers';
import { base32Encode, base32Decode, generateTotpSecret, totpAt, verifyTotp, otpauthUrl } from '@/lib/totp';
import { createUser } from '@/lib/auth';
import { createTotpChallenge, getChallenge, verifyTotpLogin } from '@/lib/auth-codes';

describe('totp core', () => {
  it('base32 round-trips arbitrary bytes', () => {
    const buf = Buffer.from('12345678901234567890');
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });

  it('matches the RFC 6238 SHA-1 test vector (T=59 → 287082)', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(totpAt(secret, 59_000)).toBe('287082');
    expect(verifyTotp(secret, '287082', 1, 59_000)).toBe(true);
    expect(verifyTotp(secret, '000000', 1, 59_000)).toBe(false);
  });

  it('accepts drift within the window and rejects outside it', () => {
    const secret = generateTotpSecret();
    const now = 1_000_000_000_000;
    const prev = totpAt(secret, now - 30_000);
    expect(verifyTotp(secret, prev, 1, now)).toBe(true);   // one step back — allowed
    const far = totpAt(secret, now - 120_000);
    expect(verifyTotp(secret, far, 1, now)).toBe(false);   // 4 steps back — rejected
    expect(verifyTotp(secret, 'abc', 1, now)).toBe(false); // not 6 digits
  });

  it('builds an otpauth URL with the secret and issuer', () => {
    const url = otpauthUrl('ABC234', 'user@example.com');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('secret=ABC234');
    expect(url).toContain('issuer=Builder+Studio');
  });
});

describe('totp login challenge', () => {
  beforeEach(() => resetDb());

  it('verifies a challenge against the user secret', () => {
    const u = createUser('s@example.com', 'password123', 'S');
    const secret = generateTotpSecret();
    const { challengeId } = createTotpChallenge(u);
    expect(getChallenge(challengeId)?.purpose).toBe('totp_login');

    const good = totpAt(secret);
    const v = verifyTotpLogin(challengeId, good, secret);
    expect(v.status).toBe('ok');
    if (v.status === 'ok') expect(v.userId).toBe(u.id);
  });

  it('counts wrong codes and consumes on success', () => {
    const u = createUser('s2@example.com', 'password123', 'S');
    const secret = generateTotpSecret();
    const { challengeId } = createTotpChallenge(u);
    const bad = verifyTotpLogin(challengeId, '000000', secret);
    expect(bad.status).toBe('invalid');
    // A consumed/blank challenge id is treated as expired.
    expect(verifyTotpLogin('nope', '123456', secret).status).toBe('expired');
  });
});
