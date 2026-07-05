import { describe, it, expect } from 'vitest';
import { getLanding } from '@/lib/landing';

describe('getLanding()', () => {
  it('returns the landing content with the expected shape', () => {
    const l = getLanding();
    expect(l.hero).toBeDefined();
    expect(typeof l.hero.title).toBe('string');
    expect(typeof l.hero.badge).toBe('string');
    expect(typeof l.hero.subtitle).toBe('string');
    expect(typeof l.hero.note).toBe('string');
    expect(typeof l.hero.ctaPrimaryLabel).toBe('string');
    expect(typeof l.hero.ctaPrimaryHref).toBe('string');
    expect(typeof l.hero.ctaSecondaryLabel).toBe('string');
    expect(typeof l.hero.ctaSecondaryHref).toBe('string');

    expect(Array.isArray(l.steps.items)).toBe(true);
    expect(l.steps.items.length).toBeGreaterThan(0);
    for (const s of l.steps.items) {
      expect(typeof s.n).toBe('string');
      expect(typeof s.title).toBe('string');
      expect(typeof s.text).toBe('string');
    }

    expect(Array.isArray(l.features.items)).toBe(true);
    for (const f of l.features.items) {
      expect(typeof f.title).toBe('string');
      expect(typeof f.text).toBe('string');
    }

    expect(typeof l.themesTeaser.title).toBe('string');
    expect(typeof l.finalCta.title).toBe('string');
    expect(typeof l.finalCta.ctaPrimaryHref).toBe('string');
  });

  it('returns a stable reference (static import)', () => {
    expect(getLanding()).toBe(getLanding());
  });
});
