'use client';

import { useEffect } from 'react';

/**
 * Samples the hero poster, finds its dominant vivid color, and sets it as the
 * global `--primary` accent so the whole page picks up the film's palette.
 * Runs client-side only; the poster is same-origin so the canvas isn't tainted.
 */
export function AccentFromPoster({ src }: { src?: string }) {
  useEffect(() => {
    if (!src) return;
    let cancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      const w = 32;
      const h = 32;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);

      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return; // tainted canvas — bail silently
      }

      // Bucket pixels by coarse color; prefer the bucket with the highest
      // cumulative saturation (i.e. the most vivid, brand-worthy hue).
      type Bucket = { r: number; g: number; b: number; n: number; score: number };
      const buckets = new Map<string, Bucket>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (max + min) / 2;
        if (lum < 30 || lum > 235) continue; // skip near-black / near-white
        const sat = max === 0 ? 0 : (max - min) / max;
        const key = `${r >> 5},${g >> 5},${b >> 5}`;
        const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 };
        cur.r += r;
        cur.g += g;
        cur.b += b;
        cur.n += 1;
        cur.score += sat;
        buckets.set(key, cur);
      }

      let best: Bucket | null = null;
      for (const v of buckets.values()) {
        if (!best || v.score > best.score) best = v;
      }
      if (!best || best.n === 0) return;

      const r = Math.round(best.r / best.n);
      const g = Math.round(best.g / best.n);
      const b = Math.round(best.b / best.n);
      const root = document.documentElement;
      root.style.setProperty('--primary', `rgb(${r} ${g} ${b})`);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      root.style.setProperty('--primary-foreground', lum > 140 ? '#0c0d11' : '#f8f8f8');
    };

    return () => {
      cancelled = true;
      // Restore the theme default so navigating away doesn't leak the accent.
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
    };
  }, [src]);

  return null;
}
