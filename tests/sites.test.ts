import { describe, it, expect, beforeEach } from 'vitest';
import {
  slugify,
  RESERVED_SLUGS,
  createSite,
  listSitesForUser,
  getSiteForUser,
  getSiteBySlug,
  getSiteByHostname,
  saveDraft,
  publishSite,
  unpublishSite,
  parseDoc,
  normalizeHostname,
  listDomains,
  addDomain,
  removeDomain,
  setDomainVerified,
  addSubmission,
  listSubmissions,
  listSubmissionsForUser,
  statsForUser,
  rebaseDoc,
  APP_HOST,
} from '@/lib/sites';
import { createUser } from '@/lib/auth';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function owner() {
  return createUser('owner@example.com', 'password123', 'Owner');
}

describe('slugify', () => {
  it('translits cyrillic + kebab-cases', () => {
    expect(slugify('Моя Кофейня #1')).toBe('moya-kofeynya-1');
  });
  it('trims leading/trailing dashes and lowercases', () => {
    expect(slugify('  Hello World!  ')).toBe('hello-world');
  });
  it('limits length to 48 chars', () => {
    expect(slugify('a'.repeat(100)).length).toBe(48);
  });
});

describe('createSite + slug uniqueness', () => {
  it('creates a site with a starter doc and derived slug', () => {
    const u = owner();
    const site = createSite(u.id, 'Coffee Shop');
    expect(site.slug).toBe('coffee-shop');
    expect(site.userId).toBe(u.id);
    const doc = parseDoc(site.draftDoc);
    expect(doc?.pages.length).toBeGreaterThan(0);
    expect(doc?.brand).toBe('Coffee Shop');
    expect(site.publishedDoc).toBeNull();
  });

  it('defaults blank name to "Мой сайт"', () => {
    const u = owner();
    const site = createSite(u.id, '   ');
    expect(site.name).toBe('Мой сайт');
  });

  it('disambiguates duplicate slugs with a numeric suffix', () => {
    const u = owner();
    const a = createSite(u.id, 'Blog');
    const b = createSite(u.id, 'Blog');
    const c = createSite(u.id, 'Blog');
    expect(a.slug).toBe('blog');
    expect(b.slug).toBe('blog-2');
    expect(c.slug).toBe('blog-3');
  });

  it('suffixes reserved slugs', () => {
    const u = owner();
    expect(RESERVED_SLUGS.has('admin')).toBe(true);
    const site = createSite(u.id, 'admin');
    expect(site.slug).toBe('admin-1');
  });

  it('falls back to "site" (reserved → suffixed) for a name with no usable chars', () => {
    const u = owner();
    const site = createSite(u.id, '###');
    // slugify('###') === '' → base 'site', which is reserved → 'site-1'
    expect(site.slug).toBe('site-1');
  });
});

describe('lookups + ownership', () => {
  it('lists sites for a user (newest updated first) and scopes by owner', () => {
    const u1 = owner();
    const u2 = createUser('two@example.com', 'password123', 'Two');
    createSite(u1.id, 'One');
    createSite(u1.id, 'Two');
    createSite(u2.id, 'Other');
    expect(listSitesForUser(u1.id).length).toBe(2);
    expect(listSitesForUser(u2.id).length).toBe(1);
  });

  it('getSiteForUser gates by ownership', () => {
    const u1 = owner();
    const u2 = createUser('two@example.com', 'password123', 'Two');
    const s = createSite(u1.id, 'Mine');
    expect(getSiteForUser(u1.id, s.id)?.id).toBe(s.id);
    expect(getSiteForUser(u2.id, s.id)).toBeNull();
    expect(getSiteForUser(u1.id, 'nope')).toBeNull();
  });

  it('getSiteBySlug', () => {
    const u = owner();
    const s = createSite(u.id, 'Findme');
    expect(getSiteBySlug('findme')?.id).toBe(s.id);
    expect(getSiteBySlug('missing')).toBeNull();
  });

  it('getSiteByHostname resolves via a verified/attached domain', () => {
    const u = owner();
    const s = createSite(u.id, 'Hosted');
    addDomain(s.id, 'Example.COM');
    expect(getSiteByHostname('example.com')?.id).toBe(s.id);
    expect(getSiteByHostname('EXAMPLE.com')?.id).toBe(s.id);
    expect(getSiteByHostname('unknown.com')).toBeNull();
  });
});

describe('draft/publish lifecycle', () => {
  it('saveDraft rewrites the draft doc', () => {
    const u = owner();
    const s = createSite(u.id, 'Draft');
    const doc = parseDoc(s.draftDoc)!;
    doc.brand = 'Renamed';
    saveDraft(s, doc);
    const reloaded = getSiteBySlug('draft')!;
    expect(parseDoc(reloaded.draftDoc)?.brand).toBe('Renamed');
  });

  it('publishSite copies draft to published, unpublishSite clears it', () => {
    const u = owner();
    const s = createSite(u.id, 'Pub');
    publishSite(s);
    let reloaded = getSiteBySlug('pub')!;
    expect(reloaded.publishedDoc).toBe(s.draftDoc);
    expect(reloaded.publishedAt).not.toBeNull();
    unpublishSite(s);
    reloaded = getSiteBySlug('pub')!;
    expect(reloaded.publishedDoc).toBeNull();
    expect(reloaded.publishedAt).toBeNull();
  });
});

describe('parseDoc', () => {
  it('returns null for null / invalid / non-page json', () => {
    expect(parseDoc(null)).toBeNull();
    expect(parseDoc('{ not json')).toBeNull();
    expect(parseDoc('{"foo":1}')).toBeNull();
  });
  it('parses a valid doc', () => {
    expect(parseDoc('{"pages":[]}')).toEqual({ pages: [] });
  });
});

describe('normalizeHostname', () => {
  it('strips scheme, port, path and lowercases', () => {
    expect(normalizeHostname('https://WWW.Example.com:443/x')).toBe('www.example.com');
  });
  it('rejects invalid hostnames', () => {
    expect(normalizeHostname('nodot')).toBeNull();
    expect(normalizeHostname('bad_host.com')).toBeNull();
    expect(normalizeHostname('a.' + 'b'.repeat(260) + '.com')).toBeNull();
  });
});

describe('domains CRUD', () => {
  it('add/list/remove/verify', () => {
    const u = owner();
    const s = createSite(u.id, 'Dom');
    const d = addDomain(s.id, 'Test.com');
    expect(d.hostname).toBe('test.com');
    expect(d.verified).toBe(false);
    expect(listDomains(s.id).length).toBe(1);

    setDomainVerified(d.id, true);
    expect(listDomains(s.id)[0].verified).toBe(true);

    expect(removeDomain(s.id, d.id)).toBe(true);
    expect(removeDomain(s.id, d.id)).toBe(false);
    expect(listDomains(s.id).length).toBe(0);
  });

  it('removeDomain is scoped by site', () => {
    const u = owner();
    const s1 = createSite(u.id, 'S1');
    const s2 = createSite(u.id, 'S2');
    const d = addDomain(s1.id, 'x.com');
    expect(removeDomain(s2.id, d.id)).toBe(false);
  });
});

describe('submissions + stats', () => {
  it('adds and lists submissions per site (newest first)', () => {
    const u = owner();
    const s = createSite(u.id, 'Forms');
    addSubmission(s.id, 'contact', { email: 'a@b.com', msg: 'hi' });
    addSubmission(s.id, 'contact', { email: 'c@d.com' });
    const list = listSubmissions(s.id);
    expect(list.length).toBe(2);
  });

  it('listSubmissionsForUser joins across the user sites', () => {
    const u = owner();
    const s = createSite(u.id, 'Forms');
    addSubmission(s.id, 'contact', { email: 'a@b.com' });
    const rows = listSubmissionsForUser(u.id);
    expect(rows.length).toBe(1);
    expect(rows[0].siteName).toBe('Forms');
    expect(rows[0].siteSlug).toBe('forms');
    expect(rows[0].formId).toBe('contact');
  });

  it('statsForUser counts sites, published, submissions', () => {
    const u = owner();
    const s1 = createSite(u.id, 'A');
    const s2 = createSite(u.id, 'B');
    publishSite(s1);
    addSubmission(s1.id, 'contact', { x: 1 });
    addSubmission(s2.id, 'contact', { x: 2 });
    const stats = statsForUser(u.id);
    expect(stats.sites).toBe(2);
    expect(stats.published).toBe(1);
    expect(stats.submissions).toBe(2);
  });
});

describe('rebaseDoc / rebaseHref', () => {
  it('rebases /site links to the tenant base across nav/footer/pages', () => {
    const doc: any = {
      base: '',
      nav: [
        { label: 'Home', href: '/site' },
        { label: 'Trailing', href: '/site/' },
        { label: 'Sub', href: '/site/about' },
        { label: 'Query', href: '/site?tab=1' },
        { label: 'External', href: 'https://x.com' },
      ],
      footer: { text: 'f', links: [{ label: 'H', href: '/site' }] },
      pages: [
        {
          blocks: [
            { type: 'button', props: { href: '/site/contact' }, children: [
              { type: 'link', props: { href: '/site' } },
            ] },
            { type: 'text', props: { text: 'no href' } },
          ],
        },
      ],
    };
    const out = rebaseDoc(doc, '/s/my-site');
    expect(out.base).toBe('/s/my-site');
    expect(out.nav[0].href).toBe('/s/my-site');
    expect(out.nav[1].href).toBe('/s/my-site');
    expect(out.nav[2].href).toBe('/s/my-site/about');
    expect(out.nav[3].href).toBe('/s/my-site?tab=1');
    expect(out.nav[4].href).toBe('https://x.com');
    expect(out.footer.links[0].href).toBe('/s/my-site');
    expect((out.pages[0].blocks[0] as any).props.href).toBe('/s/my-site/contact');
    expect((out.pages[0].blocks[0] as any).children[0].props.href).toBe('/s/my-site');
  });

  it('rebases to root "/" when base is empty (custom domain)', () => {
    const doc: any = {
      base: '',
      nav: [
        { label: 'Home', href: '/site' },
        { label: 'Query', href: '/site?a=1' },
      ],
      footer: { text: 'f', links: [] },
      pages: [],
    };
    const out = rebaseDoc(doc, '');
    expect(out.nav[0].href).toBe('/');
    expect(out.nav[1].href).toBe('/?a=1');
  });
});

describe('APP_HOST', () => {
  it('is a lowercased string', () => {
    expect(typeof APP_HOST).toBe('string');
    expect(APP_HOST).toBe(APP_HOST.toLowerCase());
  });
});
