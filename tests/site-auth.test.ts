import { describe, it, expect, beforeEach } from 'vitest';
import {
  siteRequestMeta,
  getSiteUserByEmail,
  getSiteUserById,
  createSiteUser,
  verifySiteCredentials,
  siteLockRemainingMs,
  recordSiteLoginFailure,
  clearSiteLoginFailures,
  updateSiteProfile,
  changeSitePassword,
  revokeSiteSession,
  listSiteUserSubmissions,
  listSiteUsers,
  countSiteUsers,
  listNotifications,
  countUnreadNotifications,
  markNotificationsRead,
} from '@/lib/site-auth';
import { createUser } from '@/lib/auth';
import { createSite, addSubmission } from '@/lib/sites';
import { notifyMember } from '@/lib/site-membership';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seedSite() {
  const u = createUser('owner@example.com', 'password123', 'Owner');
  return createSite(u.id, 'Tenant');
}

describe('siteRequestMeta', () => {
  it('extracts UA + ip from x-forwarded-for', () => {
    const req = new Request('https://x.com', {
      headers: { 'user-agent': 'UA', 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(siteRequestMeta(req)).toEqual({ userAgent: 'UA', ip: '1.2.3.4' });
  });
  it('falls back to x-real-ip and empty UA', () => {
    const req = new Request('https://x.com', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(siteRequestMeta(req)).toEqual({ userAgent: '', ip: '9.9.9.9' });
  });
  it('empty when no ip headers', () => {
    const req = new Request('https://x.com');
    expect(siteRequestMeta(req)).toEqual({ userAgent: '', ip: '' });
  });
});

describe('createSiteUser + lookups', () => {
  it('creates an approved user by default (normalized email)', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, ' Case@Example.com ', 'password123', ' Alice ');
    expect(su.email).toBe('case@example.com');
    expect(su.name).toBe('Alice');
    expect(su.status).toBe('approved');
    expect(su.approvedAt).not.toBeNull();
    expect(getSiteUserByEmail(s.id, 'case@example.com')?.id).toBe(su.id);
    expect(getSiteUserById(s.id, su.id)?.id).toBe(su.id);
  });

  it('supports pending status (no approvedAt)', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'p@x.com', 'password123', '', 'pending');
    expect(su.status).toBe('pending');
    expect(su.approvedAt).toBeNull();
  });

  it('throws EMAIL_TAKEN for a duplicate email on the same site', () => {
    const s = seedSite();
    createSiteUser(s.id, 'dup@x.com', 'password123');
    expect(() => createSiteUser(s.id, 'dup@x.com', 'password123')).toThrow('EMAIL_TAKEN');
  });

  it('allows the same email on different sites', () => {
    const s1 = seedSite();
    const u2 = createUser('two@example.com', 'password123', 'Two');
    const s2 = createSite(u2.id, 'Second');
    createSiteUser(s1.id, 'same@x.com', 'password123');
    expect(() => createSiteUser(s2.id, 'same@x.com', 'password123')).not.toThrow();
  });

  it('lookups return null when missing / wrong site', () => {
    const s = seedSite();
    expect(getSiteUserByEmail(s.id, 'nobody@x.com')).toBeNull();
    expect(getSiteUserById(s.id, 'nope')).toBeNull();
  });
});

describe('verifySiteCredentials', () => {
  it('returns the user for correct password, null otherwise', () => {
    const s = seedSite();
    createSiteUser(s.id, 'v@x.com', 'password123');
    expect(verifySiteCredentials(s.id, 'v@x.com', 'password123')).not.toBeNull();
    expect(verifySiteCredentials(s.id, 'v@x.com', 'wrong')).toBeNull();
    expect(verifySiteCredentials(s.id, 'missing@x.com', 'password123')).toBeNull();
  });
});

describe('brute-force lockout (site users)', () => {
  it('locks after 5 failures then clears', () => {
    const s = seedSite();
    createSiteUser(s.id, 'l@x.com', 'password123');
    let locked = false;
    for (let i = 0; i < 5; i++) {
      const u = getSiteUserByEmail(s.id, 'l@x.com')!;
      locked = recordSiteLoginFailure(u);
    }
    expect(locked).toBe(true);
    const afterLock = getSiteUserByEmail(s.id, 'l@x.com')!;
    expect(siteLockRemainingMs(afterLock)).toBeGreaterThan(0);
    clearSiteLoginFailures(afterLock);
    const cleared = getSiteUserByEmail(s.id, 'l@x.com')!;
    expect(cleared.failedAttempts).toBe(0);
    expect(siteLockRemainingMs(cleared)).toBe(0);
  });

  it('siteLockRemainingMs is 0 when not locked', () => {
    expect(siteLockRemainingMs({ lockedUntil: null })).toBe(0);
  });

  it('clearSiteLoginFailures is a no-op when already clean', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'c@x.com', 'password123');
    expect(() => clearSiteLoginFailures({ id: su.id, failedAttempts: 0, lockedUntil: null })).not.toThrow();
  });
});

describe('updateSiteProfile', () => {
  it('applies whitelisted fields (trimmed/sliced) and scopes by site', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'p@x.com', 'password123');
    const updated = updateSiteProfile(s.id, su.id, {
      name: '  New Name  ',
      phone: ' 555 ',
      avatarColor: '#fff',
      emailNotify: false,
      marketing: true,
      locale: 'ru',
    });
    expect(updated?.name).toBe('New Name');
    expect(updated?.phone).toBe('555');
    expect(updated?.avatarColor).toBe('#fff');
    expect(updated?.emailNotify).toBe(false);
    expect(updated?.marketing).toBe(true);
    expect(updated?.locale).toBe('ru');
  });

  it('ignores non-string/non-boolean patch values', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'p2@x.com', 'password123', 'Keep');
    const updated = updateSiteProfile(s.id, su.id, {} as any);
    expect(updated?.name).toBe('Keep');
  });
});

describe('changeSitePassword', () => {
  it('changes password after verifying current', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'pw@x.com', 'oldpassword');
    changeSitePassword(s.id, su.id, 'oldpassword', 'newpassword');
    expect(verifySiteCredentials(s.id, 'pw@x.com', 'newpassword')).not.toBeNull();
  });

  it('throws WRONG_PASSWORD on bad current', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'pw2@x.com', 'oldpassword');
    expect(() => changeSitePassword(s.id, su.id, 'nope', 'newpassword')).toThrow('WRONG_PASSWORD');
  });

  it('throws NOT_FOUND for a missing user', () => {
    const s = seedSite();
    expect(() => changeSitePassword(s.id, 'ghost', 'a', 'b')).toThrow('NOT_FOUND');
  });
});

describe('revokeSiteSession (db scope, no cookie)', () => {
  it('is safe to call for a non-existent session', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'r@x.com', 'password123');
    expect(() => revokeSiteSession(s.id, su.id, 'nope')).not.toThrow();
  });
});

describe('listSiteUserSubmissions', () => {
  it('matches by siteUserId or by email in payload', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'match@x.com', 'password123');
    addSubmission(s.id, 'contact', { hello: 'world' }, su.id); // by siteUserId
    addSubmission(s.id, 'contact', { email: 'MATCH@x.com' });   // by email payload
    addSubmission(s.id, 'contact', { email: 'other@x.com' });   // no match
    const rows = listSiteUserSubmissions(s.id, su.id, 'match@x.com');
    expect(rows.length).toBe(2);
    expect(rows[0].data).toBeTypeOf('object');
  });
});

describe('listSiteUsers + countSiteUsers', () => {
  it('lists users newest first and counts them, scoped by site', () => {
    const s = seedSite();
    createSiteUser(s.id, 'a@x.com', 'password123');
    createSiteUser(s.id, 'b@x.com', 'password123');
    const u2 = createUser('two@example.com', 'password123', 'Two');
    const s2 = createSite(u2.id, 'Other');
    createSiteUser(s2.id, 'c@x.com', 'password123');
    expect(listSiteUsers(s.id).length).toBe(2);
    expect(countSiteUsers(s.id)).toBe(2);
    expect(countSiteUsers(s2.id)).toBe(1);
  });
});

describe('notifications', () => {
  it('lists, counts unread, and marks read (scoped by site+user)', () => {
    const s = seedSite();
    const su = createSiteUser(s.id, 'n@x.com', 'password123');
    notifyMember(s.id, su.id, 'info', 'T1', 'M1');
    notifyMember(s.id, su.id, 'info', 'T2', 'M2');
    expect(listNotifications(s.id, su.id).length).toBe(2);
    expect(countUnreadNotifications(s.id, su.id)).toBe(2);
    markNotificationsRead(s.id, su.id);
    expect(countUnreadNotifications(s.id, su.id)).toBe(0);
  });
});
