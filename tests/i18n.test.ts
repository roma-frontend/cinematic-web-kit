import { describe, it, expect, vi } from 'vitest';
import { isLocale, LOCALES, DEFAULT_LOCALE, BCP47, LOCALE_COOKIE } from '@/lib/seo';
import { ui, UI } from '@/lib/ui-dict';
import { getLanding } from '@/lib/landing';

describe('locale helpers', () => {
  it('isLocale narrows supported locales', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('BCP47 tags exist for every locale', () => {
    for (const l of LOCALES) expect(BCP47[l]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
  });

  it('cookie name is stable', () => {
    expect(LOCALE_COOKIE).toBe('NEXT_LOCALE');
  });
});

describe('ui dictionary', () => {
  it('has matching key shape across locales', () => {
    const ru = ui('ru');
    const en = ui('en');
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(ru.nav).sort()).toEqual(Object.keys(en.nav).sort());
    expect(Object.keys(ru.actions).sort()).toEqual(Object.keys(en.actions).sort());
  });

  it('translates a known key differently per locale', () => {
    expect(UI.ru.actions.login).toBe('Войти');
    expect(UI.en.actions.login).toBe('Sign in');
  });
});

describe('getLanding', () => {
  it('returns ru by default and en when requested, with same shape', () => {
    const ru = getLanding('ru');
    const en = getLanding('en');
    expect(getLanding()).toBe(ru);
    expect(ru.hero.title).not.toBe(en.hero.title);
    expect(ru.steps.items.length).toBe(en.steps.items.length);
    expect(ru.features.items.length).toBe(en.features.items.length);
  });
});

describe('getLocale (server, cookie-backed)', () => {
  it('falls back to default when cookie is missing/invalid, reads a valid cookie', async () => {
    let value: string | undefined;
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => (value ? { value } : undefined) }),
    }));
    const { getLocale } = await import('@/lib/i18n');

    value = undefined;
    expect(await getLocale()).toBe(DEFAULT_LOCALE);

    value = 'xx';
    expect(await getLocale()).toBe(DEFAULT_LOCALE);

    value = 'en';
    expect(await getLocale()).toBe('en');

    vi.doUnmock('next/headers');
  });
});
