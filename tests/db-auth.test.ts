import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  recordLoginFailure,
  clearLoginFailures,
  lockRemainingMs,
  createSession,
  getUserByToken,
  destroySession,
  MAX_LOGIN_FAILURES,
} from '@/lib/auth';
import { resetDb } from './helpers';

// These run against an isolated throwaway SQLite file (see vitest.config env
// DATABASE_FILE), so they never touch the real data/app.db.

beforeEach(() => resetDb());

describe('user bootstrap + credentials', () => {
  it('makes the first account a superadmin, later ones customers', () => {
    const first = createUser('owner@example.com', 'password123', 'Owner');
    expect(first.role).toBe('superadmin');
    const second = createUser('member@example.com', 'password123', 'Member');
    expect(second.role).toBe('customer');
  });

  it('finds a user by (normalized) email and verifies the password', () => {
    createUser('Case@Example.com', 'hunter2secret', 'Case');
    const u = findUserByEmail('  case@example.com ');
    expect(u).not.toBeNull();
    expect(verifyPassword('hunter2secret', u!.passwordHash)).toBe(true);
    expect(verifyPassword('nope', u!.passwordHash)).toBe(false);
  });
});

describe('brute-force lockout', () => {
  it('locks the account after MAX_LOGIN_FAILURES failures, then clears', () => {
    createUser('victim@example.com', 'password123', 'Victim');

    let locked = false;
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) {
      const u = findUserByEmail('victim@example.com')!;
      locked = recordLoginFailure(u);
    }
    expect(locked).toBe(true);

    const afterLock = findUserByEmail('victim@example.com')!;
    expect(lockRemainingMs(afterLock)).toBeGreaterThan(0);

    clearLoginFailures(afterLock);
    const cleared = findUserByEmail('victim@example.com')!;
    expect(cleared.failedAttempts).toBe(0);
    expect(lockRemainingMs(cleared)).toBe(0);
  });
});

describe('sessions', () => {
  it('creates a session token that resolves back to the user, and destroys it', () => {
    const u = createUser('sess@example.com', 'password123', 'Sess');
    const { token } = createSession(u.id, { ip: '1.2.3.4', userAgent: 'vitest' });
    const resolved = getUserByToken(token);
    expect(resolved?.id).toBe(u.id);

    destroySession(token);
    expect(getUserByToken(token)).toBeNull();
  });

  it('rejects unknown/empty tokens', () => {
    expect(getUserByToken('')).toBeNull();
    expect(getUserByToken('bogus-token')).toBeNull();
  });
});
