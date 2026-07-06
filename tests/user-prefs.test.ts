import { describe, it, expect, beforeEach, vi } from 'vitest';

// A minimal in-memory cookie jar standing in for Next's cookies().
const store = new Map<string, string>();
const jar = {
  get: (k: string) => (store.has(k) ? { name: k, value: store.get(k)! } : undefined),
  set: (k: string, v: string) => void store.set(k, v),
  delete: (k: string) => void store.delete(k),
};
vi.mock('next/headers', () => ({ cookies: async () => jar }));

import { GET as prefsGet, PATCH as prefsPatch } from '@/app/api/prefs/route';
import { getUserPrefs, patchUserPrefs, MAX_PREFS_BYTES } from '@/lib/user-prefs';
import { createUser, createSession, setSessionCookie } from '@/lib/auth';
import { updateSiteProfile, createSiteUser } from '@/lib/site-auth';
import { createSite } from '@/lib/sites';
import { resetDb } from './helpers';

beforeEach(() => {
  resetDb();
  store.clear();
});

const makeUser = () => createUser('prefs@example.com', 'password123', 'Префс Тестов');

describe('lib/user-prefs', () => {
  it('returns {} for a user with no saved prefs', () => {
    const u = makeUser();
    expect(getUserPrefs(u.id)).toEqual({});
  });

  it('merges patches shallowly and persists across reads', () => {
    const u = makeUser();
    patchUserPrefs(u.id, { theme: 'light', 'cc-tab': 'security' });
    patchUserPrefs(u.id, { theme: 'dark', 'org-selector': 's_1' });
    expect(getUserPrefs(u.id)).toEqual({ theme: 'dark', 'cc-tab': 'security', 'org-selector': 's_1' });
  });

  it('null deletes a key', () => {
    const u = makeUser();
    patchUserPrefs(u.id, { theme: 'light', locale: 'en' });
    patchUserPrefs(u.id, { theme: null });
    expect(getUserPrefs(u.id)).toEqual({ locale: 'en' });
  });

  it('accepts objects and string arrays (builder chrome shape)', () => {
    const u = makeUser();
    const chrome = { pageId: 'p1', tab: 'design', previewWidth: 640, previewDark: false, collapsed: ['a', 'b'] };
    patchUserPrefs(u.id, { 'builder:s_1': chrome });
    expect(getUserPrefs(u.id)['builder:s_1']).toEqual(chrome);
  });

  it('rejects bad patches without writing anything', () => {
    const u = makeUser();
    expect(typeof patchUserPrefs(u.id, ['not', 'an', 'object'] as unknown as Record<string, unknown>)).toBe('string');
    expect(typeof patchUserPrefs(u.id, { ['x'.repeat(200)]: 1 })).toBe('string');
    expect(typeof patchUserPrefs(u.id, { fn: undefined as unknown as string })).toBe('string');
    expect(getUserPrefs(u.id)).toEqual({});
  });

  it('caps the blob size', () => {
    const u = makeUser();
    const big = 'x'.repeat(MAX_PREFS_BYTES + 1);
    expect(typeof patchUserPrefs(u.id, { big })).toBe('string');
    expect(getUserPrefs(u.id)).toEqual({});
  });
});

describe('/api/prefs route', () => {
  const login = async () => {
    const u = makeUser();
    const { token, expiresAt } = createSession(u.id);
    await setSessionCookie(token, expiresAt);
    return u;
  };

  const patchReq = (body: unknown) =>
    new Request('http://test.local/api/prefs', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('requires auth', async () => {
    expect((await prefsGet()).status).toBe(401);
    expect((await prefsPatch(patchReq({ theme: 'dark' }))).status).toBe(401);
  });

  it('GET returns saved prefs, PATCH merges and echoes the result', async () => {
    const u = await login();
    let res = await prefsPatch(patchReq({ theme: 'light', locale: 'en' }));
    expect(res.status).toBe(200);
    res = await prefsPatch(patchReq({ locale: null, 'db-table': 'sites' }));
    expect((await res.json()).prefs).toEqual({ theme: 'light', 'db-table': 'sites' });
    const got = await (await prefsGet()).json();
    expect(got.prefs).toEqual({ theme: 'light', 'db-table': 'sites' });
    expect(getUserPrefs(u.id)).toEqual({ theme: 'light', 'db-table': 'sites' });
  });

  it('rejects malformed JSON and invalid patches with 400', async () => {
    await login();
    expect((await prefsPatch(patchReq('not json'))).status).toBe(400);
    expect((await prefsPatch(patchReq({ ['k'.repeat(200)]: 1 }))).status).toBe(400);
  });
});

describe('site_users.theme (visitor theme persistence)', () => {
  it('updateSiteProfile stores only valid theme values', () => {
    const owner = makeUser();
    const site = createSite(owner.id, 'Тест');
    const su = createSiteUser(site.id, 'member@example.com', 'password123', 'Член');
    expect(updateSiteProfile(site.id, su.id, { theme: 'light' })?.theme).toBe('light');
    expect(updateSiteProfile(site.id, su.id, { theme: 'neon' })?.theme).toBe('light'); // ignored
    expect(updateSiteProfile(site.id, su.id, { theme: '' })?.theme).toBe('');
  });
});
