import { describe, it, expect } from 'vitest';
import { tourChrome, getTour } from '@/lib/tour/tours';
import type { TourId } from '@/lib/tour/types';
import type { Locale } from '@/lib/seo';
import { PRESETS, getPreset } from '@/lib/presets';

const LOCALES: Locale[] = ['ru', 'en', 'hy'];
const TOUR_IDS: TourId[] = ['studio-builder', 'site-content', 'dashboard-sites', 'dashboard-overview'];
const CHROME_KEYS = ['back', 'next', 'done', 'skip', 'step', 'clickHere', 'replay', 'soundOn', 'soundOff'] as const;

describe('tourChrome', () => {
  it('returns localized chrome (all keys) for every locale', () => {
    for (const l of LOCALES) {
      const c = tourChrome(l);
      for (const k of CHROME_KEYS) {
        expect(typeof c[k]).toBe('string');
        expect(c[k].length).toBeGreaterThan(0);
      }
      // The step counter template must carry both placeholders.
      expect(c.step).toContain('{n}');
      expect(c.step).toContain('{total}');
    }
  });

  it('falls back to English for an unknown locale', () => {
    expect(tourChrome('zz' as Locale)).toEqual(tourChrome('en'));
  });
});

describe('getTour', () => {
  it('builds a well-formed tour for every id and locale', () => {
    for (const id of TOUR_IDS) {
      for (const l of LOCALES) {
        const tour = getTour(id, l);
        expect(tour.id).toBe(id);
        expect(tour.steps.length).toBeGreaterThan(0);
        for (const s of tour.steps) {
          expect(typeof s.title).toBe('string');
          expect(s.title.length).toBeGreaterThan(0);
          expect(typeof s.body).toBe('string');
          expect(s.body.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('step onEnter side-effects are safe to run without a DOM', () => {
    const withEnter = getTour('studio-builder', 'ru').steps.filter((s) => s.onEnter);
    expect(withEnter.length).toBeGreaterThan(0);
    // In Node there is no document; the click() helper must no-op, not throw.
    for (const s of withEnter) expect(() => s.onEnter!()).not.toThrow();
  });
});

describe('PRESETS / getPreset', () => {
  it('every preset is well-formed with a unique slug', () => {
    expect(PRESETS.length).toBe(6);
    const slugs = new Set<string>();
    for (const p of PRESETS) {
      expect(p.slug).toBeTruthy();
      expect(slugs.has(p.slug)).toBe(false);
      slugs.add(p.slug);
      expect(p.theme).toBeTruthy();
      expect(p.featureIcons).toHaveLength(3);
      expect(p.cover).toContain('from-');
      expect(Array.isArray(p.sections)).toBe(true);
      expect(['pricing', 'menu', 'schedule']).toContain(p.offerStyle);
    }
  });

  it('getPreset resolves a known slug and returns undefined otherwise', () => {
    expect(getPreset('launch')?.theme).toBe('tech-saas');
    expect(getPreset('does-not-exist')).toBeUndefined();
  });
});
