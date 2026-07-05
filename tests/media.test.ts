import { describe, it, expect } from 'vitest';
import type { MediaEntry } from '@/lib/media';

// lib/media.ts is a pure type module (no runtime code). These tests exercise the
// type by constructing conforming values so the module is imported/compiled.
describe('MediaEntry type', () => {
  it('accepts a minimal entry', () => {
    const m: MediaEntry = { id: 'a', title: 'A', section: 'hero', src: '/a.webm' };
    expect(m.section).toBe('hero');
  });

  it('accepts a fully-populated entry', () => {
    const m: MediaEntry = {
      id: 'b',
      title: 'B',
      section: 'card',
      prompt: 'p',
      style: 'a24',
      negativePrompt: 'n',
      sound: true,
      src: '/b.webm',
      srcMp4: '/b.mp4',
      poster: '/b.jpg',
      aspectRatio: '1:1',
      createdAt: new Date().toISOString(),
      ctaLabel: 'Go',
      ctaHref: '/x',
      subtitle: 'sub',
    };
    expect(m.section).toBe('card');
    expect(m.sound).toBe(true);
    const sections: MediaEntry['section'][] = ['hero', 'background', 'card'];
    expect(sections).toContain(m.section);
  });
});
