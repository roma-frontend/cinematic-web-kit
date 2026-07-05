import { describe, it, expect } from 'vitest';
import {
  THEMES,
  DEFAULT_THEME,
  FONT_VAR,
  getTheme,
  pickTheme,
  themeCss,
} from '@/lib/themes';

describe('THEMES registry', () => {
  it('exposes a non-empty list with default = first', () => {
    expect(THEMES.length).toBeGreaterThan(0);
    expect(DEFAULT_THEME).toBe(THEMES[0]);
    expect(DEFAULT_THEME.id).toBe('modern-clean');
  });

  it('every theme has unique ids and required shape', () => {
    const ids = new Set<string>();
    for (const t of THEMES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(Array.isArray(t.layout)).toBe(true);
      expect(Array.isArray(t.keywords)).toBe(true);
      expect(typeof t.radius).toBe('string');
      expect(['serif', 'grotesk', 'sans']).toContain(t.fontDisplay);
      expect(['soft', 'snappy', 'dramatic']).toContain(t.motion);
    }
  });
});

describe('FONT_VAR', () => {
  it('maps each display font to a css var', () => {
    expect(FONT_VAR.serif).toBe('var(--font-serif)');
    expect(FONT_VAR.grotesk).toBe('var(--font-grotesk)');
    expect(FONT_VAR.sans).toBe('var(--font-sans)');
  });
});

describe('getTheme()', () => {
  it('returns the matching theme by id', () => {
    expect(getTheme('editorial-coffee').id).toBe('editorial-coffee');
  });
  it('falls back to default for unknown id', () => {
    expect(getTheme('does-not-exist')).toBe(DEFAULT_THEME);
  });
});

describe('pickTheme()', () => {
  it('routes a coffee brief to the editorial-coffee theme', () => {
    expect(pickTheme('Уютное кафе, свежая обжарка и латте').id).toBe('editorial-coffee');
  });
  it('routes an english sport brief to sport-dynamic', () => {
    expect(pickTheme('a football match at the stadium, our team scored a goal').id).toBe('sport-dynamic');
  });
  it('routes a tech brief to tech-saas', () => {
    expect(pickTheme('an AI startup building a cloud platform').id).toBe('tech-saas');
  });
  it('falls back to default when nothing matches', () => {
    expect(pickTheme('zzzz qqqq wwww')).toBe(DEFAULT_THEME);
  });
  it('handles empty / undefined brief', () => {
    expect(pickTheme('')).toBe(DEFAULT_THEME);
    // @ts-expect-error exercising the (brief || '') guard
    expect(pickTheme(undefined)).toBe(DEFAULT_THEME);
  });
});

describe('themeCss()', () => {
  it('produces :root and .dark blocks with oklch tokens and shared vars', () => {
    const css = themeCss(DEFAULT_THEME);
    expect(css).toContain(':root{');
    expect(css).toContain('.dark{');
    expect(css).toContain('--background: oklch(');
    expect(css).toContain('--border: oklch(');
    expect(css).toContain(`--radius: ${DEFAULT_THEME.radius};`);
    expect(css).toContain('--font-display: var(--font-sans);');
  });

  it('uses the theme-specific display font var', () => {
    const coffee = getTheme('editorial-coffee');
    expect(themeCss(coffee)).toContain('--font-display: var(--font-serif);');
  });
});
