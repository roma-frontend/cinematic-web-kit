import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();
const jar = {
  get: (k: string) => (store.has(k) ? { name: k, value: store.get(k)! } : undefined),
  set: (k: string, v: string) => void store.set(k, v),
  delete: (k: string) => void store.delete(k),
};
vi.mock('next/headers', () => ({ cookies: async () => jar }));

import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import {
  createSiteUser,
  createSiteSession,
  getSiteUser,
  listSiteSessions,
  revokeOtherSiteSessions,
  destroySiteSession,
  deleteSiteUser,
} from '@/lib/site-auth';
import { resetDb } from './helpers';

beforeEach(() => {
  resetDb();
  store.clear();
});

describe('site session lifecycle (cookie-backed)', () => {
  it('creates a session resolvable via getSiteUser scoped to the site', async () => {
    const owner = createUser('owner@example.com', 'password123', 'Owner');
    const site = createSite(owner.id, 'Shop');
    const su = createSiteUser(site.id, 'member@example.com', 'password123', 'Member', 'approved');

    await createSiteSession(su.id, site.id, { ip: '1.1.1.1', userAgent: 'UA' });
    const me = await getSiteUser(site.id);
    expect(me?.id).toBe(su.id);

    // A cookie is scoped to its site: another site id must not resolve it.
    const other = createSite(owner.id, 'Other');
    expect(await getSiteUser(other.id)).toBeNull();
  });

  it('lists sessions and marks the current one', async () => {
    const owner = createUser('o2@example.com', 'password123', 'O2');
    const site = createSite(owner.id, 'Shop2');
    const su = createSiteUser(site.id, 'm2@example.com', 'password123', 'M2', 'approved');
    await createSiteSession(su.id, site.id, {});
    const rows = await listSiteSessions(site.id, su.id);
    expect(rows.length).toBe(1);
    expect(rows[0].current).toBe(true);
  });

  it('revokes other sessions, keeping the current one', async () => {
    const owner = createUser('o3@example.com', 'password123', 'O3');
    const site = createSite(owner.id, 'Shop3');
    const su = createSiteUser(site.id, 'm3@example.com', 'password123', 'M3', 'approved');
    await createSiteSession(su.id, site.id, {}); // session #1 (cookie)
    await createSiteSession(su.id, site.id, {}); // session #2 becomes current cookie
    expect((await listSiteSessions(site.id, su.id)).length).toBe(2);
    await revokeOtherSiteSessions(site.id, su.id);
    const left = await listSiteSessions(site.id, su.id);
    expect(left.length).toBe(1);
    expect(left[0].current).toBe(true);
  });

  it('destroySiteSession logs out; deleteSiteUser removes the account', async () => {
    const owner = createUser('o4@example.com', 'password123', 'O4');
    const site = createSite(owner.id, 'Shop4');
    const su = createSiteUser(site.id, 'm4@example.com', 'password123', 'M4', 'approved');
    await createSiteSession(su.id, site.id, {});
    await destroySiteSession();
    expect(await getSiteUser(site.id)).toBeNull();

    await createSiteSession(su.id, site.id, {});
    await deleteSiteUser(site.id, su.id);
    expect(await getSiteUser(site.id)).toBeNull();
  });
});
