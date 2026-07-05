import { describe, it, expect } from 'vitest';
import {
  STYLE_PRESETS,
  NEGATIVE_PROMPT,
  getPreset,
  resolveStyle,
  composePrompt,
  planFromBrief,
  type StyleId,
} from '@/lib/prompt-composer';

describe('constants', () => {
  it('exposes style presets and a negative prompt', () => {
    expect(STYLE_PRESETS.length).toBeGreaterThan(0);
    expect(typeof NEGATIVE_PROMPT).toBe('string');
    expect(NEGATIVE_PROMPT).toContain('watermark');
    for (const p of STYLE_PRESETS) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.lens).toBe('string');
      expect(typeof p.mood).toBe('string');
    }
  });
});

describe('getPreset()', () => {
  it('returns the requested preset', () => {
    expect(getPreset('cyberpunk').id).toBe('cyberpunk');
  });
  it('falls back to the first preset for an unknown id', () => {
    // @ts-expect-error deliberately unknown id to hit the fallback branch
    expect(getPreset('nope')).toBe(STYLE_PRESETS[0]);
  });
});

describe('resolveStyle()', () => {
  it('returns the concrete preset for a non-auto style', () => {
    expect(resolveStyle('noir', 'seed').id).toBe('noir');
  });
  it('deterministically picks a preset for auto', () => {
    const a = resolveStyle('auto', 'coffee');
    const b = resolveStyle('auto', 'coffee');
    expect(a).toBe(b);
    expect(STYLE_PRESETS).toContain(a);
  });
});

describe('composePrompt()', () => {
  it('returns empty string for a blank brief', () => {
    expect(composePrompt({ brief: '   ', section: 'hero' })).toBe('');
    expect(composePrompt({ brief: '.', section: 'hero' })).toBe('');
  });

  it('composes a layered prompt with framing + subject + quality', () => {
    const out = composePrompt({ brief: 'car brake discs.', section: 'hero', style: 'teal-orange' });
    expect(out).toContain('of car brake discs');
    expect(out).toContain('anamorphic 40mm lens');
    expect(out).toContain('ultra-detailed, 8k');
    expect(out.startsWith('sweeping cinematic wide establishing shot')).toBe(true);
  });

  it('uses the card framing for card sections', () => {
    const out = composePrompt({ brief: 'oil filter', section: 'card', style: 'luxury' });
    expect(out.startsWith('macro close-up product shot')).toBe(true);
  });

  it('uses the background framing for background sections', () => {
    const out = composePrompt({ brief: 'fog', section: 'background', style: 'dreamy' });
    expect(out.startsWith('slow immersive parallax shot')).toBe(true);
  });

  it('resolves auto style and uses provided seed/index deterministically', () => {
    const a = composePrompt({ brief: 'x', section: 'hero', style: 'auto', seed: 's', index: 2 });
    const b = composePrompt({ brief: 'x', section: 'hero', style: 'auto', seed: 's', index: 2 });
    expect(a).toBe(b);
  });
});

describe('planFromBrief()', () => {
  it('returns an empty plan for empty input', () => {
    expect(planFromBrief('')).toEqual([]);
    expect(planFromBrief('   \n  \n')).toEqual([]);
  });

  it('makes a hero from the first line and cards from the rest', () => {
    const brief = ['- Coffee beans roasting', 'Pour over', 'Latte art'].join('\n');
    const plan = planFromBrief(brief, 'a24');
    expect(plan[0].section).toBe('hero');
    expect(plan[0].aspect).toBe('16:9');
    expect(plan[0].style).toBe('a24');
    expect(plan[0].title).toBe('Coffee beans roasting');
    expect(plan.slice(1).every((p) => p.section === 'card' && p.aspect === '1:1')).toBe(true);
    expect(plan.length).toBe(3);
  });

  it('caps cards at 6 (7 lines -> hero + 6 cards)', () => {
    const brief = Array.from({ length: 10 }, (_, i) => `Line ${i}`).join('\n');
    const plan = planFromBrief(brief);
    expect(plan.length).toBe(7);
  });

  it('strips list markers and title-cases, single line -> just hero', () => {
    const plan = planFromBrief('# hero only line');
    expect(plan.length).toBe(1);
    expect(plan[0].title).toBe('Hero only line');
  });

  it('resolves auto style consistently across items', () => {
    const plan = planFromBrief('first\nsecond', 'auto');
    const styles = new Set(plan.map((p) => p.style));
    expect(styles.size).toBe(1);
    expect(plan[0].style).not.toBe('auto' as StyleId);
  });
});
