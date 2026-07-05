import { describe, it, expect, vi, beforeEach } from 'vitest';

// site-theme reads data/site.json + data/media.json at call time; mock those
// json imports so we can exercise both the fixed-theme and `auto` branches.
type Site = { theme?: string };
type Media = Array<{ title?: string; subtitle?: string; prompt?: string }>;

async function load(site: Site, media: Media) {
  vi.resetModules();
  vi.doMock('@/data/site.json', () => ({ default: site }));
  vi.doMock('@/data/media.json', () => ({ default: media }));
  return import('@/lib/site-theme');
}

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock('@/data/site.json');
  vi.doUnmock('@/data/media.json');
});

describe('siteTheme()', () => {
  it('returns the saved fixed theme', async () => {
    const { siteTheme } = await load({ theme: 'editorial-coffee' }, []);
    expect(siteTheme().id).toBe('editorial-coffee');
  });

  it('resolves to the default theme when set to auto', async () => {
    const { siteTheme } = await load({ theme: 'auto' }, [{ title: 'кофе латте' }]);
    expect(siteTheme().id).toBe('modern-clean');
  });

  it('treats a missing theme field as auto -> default', async () => {
    const { siteTheme } = await load({}, []);
    expect(siteTheme().id).toBe('modern-clean');
  });
});

describe('activeSiteTheme()', () => {
  it('returns the saved fixed theme directly', async () => {
    const { activeSiteTheme } = await load({ theme: 'sport-dynamic' }, []);
    expect(activeSiteTheme().id).toBe('sport-dynamic');
  });

  it('derives the theme from media content when auto', async () => {
    const { activeSiteTheme } = await load({ theme: 'auto' }, [
      { title: 'Эспрессо', subtitle: 'Свежая обжарка', prompt: 'латте бариста' },
    ]);
    expect(activeSiteTheme().id).toBe('editorial-coffee');
  });

  it('handles media entries with missing fields (falls back to default)', async () => {
    const { activeSiteTheme } = await load({ theme: 'auto' }, [{}, { title: 'zzz' }]);
    expect(activeSiteTheme().id).toBe('modern-clean');
  });

  it('treats missing theme field as auto and derives from content', async () => {
    const { activeSiteTheme } = await load({}, [{ prompt: 'football match stadium goal' }]);
    expect(activeSiteTheme().id).toBe('sport-dynamic');
  });
});
