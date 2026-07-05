import { describe, it, expect } from 'vitest';
import {
  SITE_NAME,
  APP_URL,
  subdomainUrl,
  LOCALES,
  DEFAULT_LOCALE,
  OG_LOCALE,
  localeAlternates,
  KEYWORDS,
  siteJsonLd,
  tenantJsonLd,
} from '@/lib/seo';

describe('seo constants', () => {
  it('exposes a site name, keywords and locales', () => {
    expect(SITE_NAME).toBeTruthy();
    expect(KEYWORDS.length).toBeGreaterThan(0);
    expect(LOCALES).toContain('ru');
    expect(LOCALES).toContain('en');
    expect(LOCALES).toContain(DEFAULT_LOCALE);
    expect(OG_LOCALE[DEFAULT_LOCALE]).toBe('ru_RU');
    expect(OG_LOCALE.en).toBe('en_US');
  });

  it('APP_URL is absolute (defaults to localhost in tests)', () => {
    expect(APP_URL).toMatch(/^https?:\/\/.+/);
  });
});

describe('subdomainUrl', () => {
  it('builds a subdomain URL for a slug', () => {
    // Default host in tests is localhost:3000 → http.
    expect(subdomainUrl('coffee')).toBe('http://coffee.localhost:3000');
  });

  it('appends a normalized path', () => {
    expect(subdomainUrl('coffee', 'about')).toBe('http://coffee.localhost:3000/about');
    expect(subdomainUrl('coffee', '/about')).toBe('http://coffee.localhost:3000/about');
    expect(subdomainUrl('coffee', '/')).toBe('http://coffee.localhost:3000');
  });
});

describe('localeAlternates', () => {
  it('is a no-op until localized routes exist', () => {
    expect(localeAlternates('/')).toBeUndefined();
  });
});

describe('JSON-LD', () => {
  it('siteJsonLd exposes Organization + WebSite graph', () => {
    const ld = siteJsonLd() as { '@graph': { '@type': string }[] };
    const types = ld['@graph'].map((n) => n['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
  });

  it('tenantJsonLd builds a WebSite node with optional description', () => {
    const withDesc = tenantJsonLd('Coffee', 'https://coffee.example.com', 'Best beans') as Record<string, unknown>;
    expect(withDesc['@type']).toBe('WebSite');
    expect(withDesc.name).toBe('Coffee');
    expect(withDesc.url).toBe('https://coffee.example.com');
    expect(withDesc.description).toBe('Best beans');

    const noDesc = tenantJsonLd('Shop', 'https://shop.example.com') as Record<string, unknown>;
    expect('description' in noDesc).toBe(false);
  });
});
