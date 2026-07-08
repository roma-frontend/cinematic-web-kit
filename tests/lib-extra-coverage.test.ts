import { describe, it, expect } from 'vitest';
import { chromeBtnClass, navLinkClass, CHROME_BTN_VARIANTS, NAV_STYLES, THEME_BTN_PRESETS } from '@/lib/builder/chrome-buttons';
import { makeNode } from '@/lib/builder/types';
import { collectSymbols, findBySymbol, applySymbol } from '@/lib/builder/tree';

describe('chrome-buttons', () => {
  it('chromeBtnClass builds a class for every variant and falls back on unknowns', () => {
    for (const v of CHROME_BTN_VARIANTS) {
      const cls = chromeBtnClass(v, 'md', 'lg', 'x-extra');
      expect(cls).toContain('inline-flex');
      expect(cls).toContain('x-extra');
    }
    // Unknown values fall back to default / sm / full.
    const fb = chromeBtnClass('nope', 'nope', 'nope');
    expect(fb).toContain('rounded-full');
    expect(fb).toContain('bg-primary');
  });

  it('navLinkClass returns a class per style and falls back to pills', () => {
    for (const s of NAV_STYLES) expect(typeof navLinkClass(s)).toBe('string');
    expect(navLinkClass('unknown')).toBe(navLinkClass('pills'));
    expect(navLinkClass()).toBe(navLinkClass('pills'));
  });

  it('THEME_BTN_PRESETS entries carry the required fields', () => {
    const keys = Object.keys(THEME_BTN_PRESETS);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const p = THEME_BTN_PRESETS[key];
      expect(p.authLoginVariant).toBeTruthy();
      expect(p.navStyle).toBeTruthy();
    }
  });
});

describe('tree symbols', () => {
  const build = () => {
    const a = makeNode('text'); a.props.symbolId = 'sym1'; a.props.symbolName = 'Header'; a.props.text = 'A';
    const b = makeNode('text'); b.props.symbolId = 'sym1'; b.props.text = 'B';
    const root = makeNode('section'); root.children = [a, b];
    return { a, b, root };
  };

  it('collectSymbols maps distinct symbolIds to their names', () => {
    const { root } = build();
    const map = collectSymbols([root]);
    expect(map.get('sym1')).toBe('Header');
    expect(map.size).toBe(1);
  });

  it('findBySymbol finds the first node with a symbolId, or null', () => {
    const { root, a } = build();
    expect(findBySymbol([root], 'sym1')?.id).toBe(a.id);
    expect(findBySymbol([root], 'missing')).toBeNull();
  });

  it('applySymbol syncs sibling instances to the master while keeping their ids', () => {
    const { root, a, b } = build();
    const master = { ...a, props: { ...a.props, text: 'SYNCED' } };
    const [newRoot] = applySymbol([root], 'sym1', master, a.id);
    const nb = newRoot.children!.find((n) => n.id === b.id)!;
    expect(nb.props.text).toBe('SYNCED'); // b took the master's content
    expect(nb.id).toBe(b.id); // …but kept its own id
  });
});
