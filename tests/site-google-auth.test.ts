import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import { createSiteUser, getSiteUserById } from '@/lib/site-auth';
import { loginOrCreateSiteGoogleUser } from '@/lib/site-google-auth';
import { createSiteOauthHandoff, consumeSiteOauthHandoff } from '@/lib/site-auth-codes';
import type { GoogleProfile } from '@/lib/google-auth';
import { getDb, siteUsers } from '@/lib/db';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seedSite() {
  const u = createUser('owner@example.com', 'password123', 'Owner');
  return createSite(u.id, 'Tenant');
}

function profile(o: Partial<GoogleProfile> = {}): GoogleProfile {
  return { sub: 'g-1', email: 'member@example.com', email_verified: true, name: 'A Member', ...o };
}

describe('loginOrCreateSiteGoogleUser', () => {
  it('creates a member (approved when the site has no approval gate)', () => {
    const s = seedSite();
    const { user, created } = loginOrCreateSiteGoogleUser(s.id, profile({ sub: 'g-10' }), false);
    expect(created).toBe(true);
    expect(user.googleId).toBe('g-10');
    expect(user.status).toBe('approved');
    expect(user.email).toBe('member@example.com');
  });

  it('creates a PENDING member when the site requires approval', () => {
    const s = seedSite();
    const { user } = loginOrCreateSiteGoogleUser(s.id, profile({ sub: 'g-11' }), true);
    expect(user.status).toBe('pending');
  });

  it('is idempotent by google id (no duplicate)', () => {
    const s = seedSite();
    const p = profile({ sub: 'g-12' });
    loginOrCreateSiteGoogleUser(s.id, p, false);
    const again = loginOrCreateSiteGoogleUser(s.id, p, false);
    expect(again.created).toBe(false);
    const rows = getDb().select().from(siteUsers).all().filter((u) => u.googleId === 'g-12');
    expect(rows.length).toBe(1);
  });

  it('links Google to an existing password member (same email, one account)', () => {
    const s = seedSite();
    const existing = createSiteUser(s.id, 'member@example.com', 'password123', 'Member');
    const { user, created } = loginOrCreateSiteGoogleUser(s.id, profile({ sub: 'g-13' }), false);
    expect(created).toBe(false);
    expect(user.id).toBe(existing.id);
    expect(user.googleId).toBe('g-13');
    const rows = getDb().select().from(siteUsers).all().filter((u) => u.email === 'member@example.com');
    expect(rows.length).toBe(1);
  });

  it('isolates members per site (same email on two sites = two accounts)', () => {
    const s1 = seedSite();
    const u2 = createUser('owner2@example.com', 'password123', 'Owner2');
    const s2 = createSite(u2.id, 'Tenant2');
    const a = loginOrCreateSiteGoogleUser(s1.id, profile({ sub: 'g-a' }), false);
    const b = loginOrCreateSiteGoogleUser(s2.id, profile({ sub: 'g-b' }), false);
    expect(a.user.id).not.toBe(b.user.id);
    expect(a.user.siteId).toBe(s1.id);
    expect(b.user.siteId).toBe(s2.id);
  });
});

describe('site OAuth handoff token', () => {
  it('round-trips once, then is single-use', () => {
    const s = seedSite();
    const { user } = loginOrCreateSiteGoogleUser(s.id, profile({ sub: 'g-20' }), false);
    const { token } = createSiteOauthHandoff({ id: user.id, email: user.email, siteId: s.id });
    const first = consumeSiteOauthHandoff(token);
    expect(first).toEqual({ siteUserId: user.id, siteId: s.id });
    expect(consumeSiteOauthHandoff(token)).toBeNull(); // already burned
  });

  it('rejects an unknown token', () => {
    expect(consumeSiteOauthHandoff('nope')).toBeNull();
    expect(consumeSiteOauthHandoff('')).toBeNull();
  });
});
