import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from '@/lib/auth';
import { createSite, getSite } from '@/lib/sites';
import { getSiteUserByEmail } from '@/lib/site-auth';
import { performAction } from '@/lib/assistant-actions';
import { getRawDb } from '@/lib/db';
import { resetDb } from './helpers';

beforeEach(() => {
  resetDb();
  // The first account in an empty DB becomes superadmin, so burn one bootstrap
  // user once per test before creating real test users.
  createUser('bootstrap@example.com', 'password123', 'Bootstrap');
});

function makeCustomer(email?: string) {
  return createUser(email ?? `u${Math.random().toString(36).slice(2)}@ex.com`, 'password123', 'Customer');
}

describe('performAction mutations', () => {
  it('creates a site via create_site', () => {
    const u = makeCustomer('creator@example.com');
    const result = performAction(u, { kind: 'create_site', name: 'Coffee Shop' }, 'en');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Coffee Shop');
    expect(result.redirect).toBe('/dashboard/sites');
    const sites = getRawDb().prepare('SELECT * FROM sites WHERE user_id = ?').all(u.id) as { name: string }[];
    expect(sites.some((s) => s.name === 'Coffee Shop')).toBe(true);
  });

  it('creates a site with an explicit locale', () => {
    const u = makeCustomer('locale@example.com');
    const result = performAction(u, { kind: 'create_site', name: 'Rosta', locale: 'hy' }, 'en');
    expect(result.ok).toBe(true);
  });

  it('publishes an existing site via publish_site', () => {
    const u = makeCustomer('pub@example.com');
    const site = createSite(u.id, 'Tea House');
    expect(site.publishedAt).toBeNull();
    const result = performAction(u, { kind: 'publish_site', siteId: site.id }, 'en');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Tea House');
    expect(result.redirect).toBe(`/s/${site.slug}`);
    const updated = getSite(site.id)!;
    expect(updated.publishedAt).not.toBeNull();
    expect(updated.publishedDoc).not.toBeNull();
  });

  it('invites a site user via invite_site_user', () => {
    const u = makeCustomer('inviter@example.com');
    const site = createSite(u.id, 'Book Club');
    const result = performAction(
      u,
      { kind: 'invite_site_user', siteId: site.id, email: 'member@example.com', name: 'Alex' },
      'en',
    );
    expect(result.ok).toBe(true);
    expect(result.message).toContain('member@example.com');
    const invited = getSiteUserByEmail(site.id, 'member@example.com');
    expect(invited).not.toBeNull();
    expect(invited!.name).toBe('Alex');
  });

  it('rejects inviting the same email twice to the same site', () => {
    const u = makeCustomer('double@example.com');
    const site = createSite(u.id, 'Book Club');
    performAction(u, { kind: 'invite_site_user', siteId: site.id, email: 'd@example.com' }, 'en');
    const second = performAction(u, { kind: 'invite_site_user', siteId: site.id, email: 'd@example.com' }, 'en');
    expect(second.ok).toBe(false);
    expect(second.message).toContain('already a member');
  });

  it('prevents a customer from publishing another user site', () => {
    const owner = makeCustomer('owner@example.com');
    const intruder = makeCustomer('intruder@example.com');
    const site = createSite(owner.id, 'Owner Project');
    const result = performAction(intruder, { kind: 'publish_site', siteId: site.id }, 'en');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('not manageable');
  });

  it('allows a superadmin to publish any site', () => {
    // Create a fresh superadmin first (it must be the first user in the DB).
    resetDb();
    const superadmin = createUser('root@example.com', 'password123', 'Root');
    expect(superadmin.role).toBe('superadmin');
    const owner = createUser('owner2@example.com', 'password123', 'Owner');
    const site = createSite(owner.id, 'Owner Project');
    const result = performAction(superadmin, { kind: 'publish_site', siteId: site.id }, 'en');
    expect(result.ok).toBe(true);
  });

  it('localises result summaries', () => {
    const u = makeCustomer('ru@example.com');
    const result = performAction(u, { kind: 'create_site', name: 'X' }, 'ru');
    expect(result.ok).toBe(true);
    expect(result.message).toContain('Создан');
  });
});
