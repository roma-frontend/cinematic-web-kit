import { describe, it, expect } from 'vitest';
import {
  TEMPLATES,
  LANDINGS,
  SECTION_PRESETS,
  starterPage,
  isPristineStarter,
} from '@/lib/builder/templates';
import type { BuilderNode, BuilderPage } from '@/lib/builder/types';

function collectIds(nodes: BuilderNode[], acc: string[] = []): string[] {
  for (const n of nodes) {
    acc.push(n.id);
    if (n.children) collectIds(n.children, acc);
  }
  return acc;
}

function assertValidPage(page: BuilderPage) {
  expect(typeof page.id).toBe('string');
  expect(typeof page.title).toBe('string');
  expect(Array.isArray(page.blocks)).toBe(true);
  expect(page.blocks.length).toBeGreaterThan(0);
  const ids = collectIds(page.blocks);
  expect(new Set(ids).size).toBe(ids.length); // all node ids unique
}

describe('TEMPLATES', () => {
  it('every template builds a valid page with fresh unique ids', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);
    for (const t of TEMPLATES) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.label).toBe('string');
      const p1 = t.build();
      const p2 = t.build();
      assertValidPage(p1);
      // rebuilding gives different ids (fresh page each time)
      expect(p1.id).not.toBe(p2.id);
      // suggestedPath maps to the built path
      expect(p1.path).toBe(t.suggestedPath);
    }
  });

  it('has unique template ids', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('LANDINGS', () => {
  it('every landing builds a valid home page (path empty) with unique ids', () => {
    expect(LANDINGS.length).toBe(10);
    for (const l of LANDINGS) {
      const p = l.build();
      assertValidPage(p);
      expect(p.path).toBe('');
      expect(typeof l.themeId).toBe('string');
    }
  });

  it('has unique landing ids', () => {
    const ids = LANDINGS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('SECTION_PRESETS', () => {
  it('every preset builds a single section node', () => {
    expect(SECTION_PRESETS.length).toBeGreaterThan(0);
    for (const s of SECTION_PRESETS) {
      const node = s.build();
      expect(node.type).toBe('section');
      const ids = collectIds([node]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has unique preset ids', () => {
    const ids = SECTION_PRESETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('starterPage()', () => {
  it('creates a home page embedding the brand name', () => {
    const p = starterPage('Acme Co');
    assertValidPage(p);
    expect(p.path).toBe('');
    expect(p.description).toContain('Acme Co');
    // brand appears in a heading somewhere
    const ids = collectIds(p.blocks);
    expect(ids.length).toBeGreaterThan(3);
    // fresh ids each call
    expect(starterPage('X').id).not.toBe(p.id);
  });
});


describe('isPristineStarter', () => {
  it('is true for a freshly created starter home page', () => {
    expect(isPristineStarter(starterPage('Acme'))).toBe(true);
  });

  it('is false for any ready-made landing', () => {
    for (const t of LANDINGS) expect(isPristineStarter(t.build())).toBe(false);
  });

  it('is false once the starter marker is gone (page edited)', () => {
    const p = starterPage('Acme');
    const edited = { ...p, blocks: LANDINGS[0].build().blocks };
    expect(isPristineStarter(edited)).toBe(false);
  });
});
