import { describe, it, expect } from 'vitest';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { optimizeUpload, UPLOAD_DIR, ACCEPTED_TYPES } from '@/lib/media-optimize';

describe('optimizeUpload — SVG passthrough (no ffmpeg, local storage)', () => {
  it('stores an SVG as-is and returns a local /uploads url', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
    const file = new File([svg], 'logo.svg', { type: 'image/svg+xml' });

    const res = await optimizeUpload(file);
    try {
      expect(res.kind).toBe('raw');
      expect(res.url).toMatch(/^\/uploads\/.*\.svg$/);
      // SVG is not transcoded, so sizes match.
      expect(res.optimizedBytes).toBe(res.originalBytes);
      expect(res.originalBytes).toBe(Buffer.byteLength(svg));
    } finally {
      // Clean up the file this test wrote under public/uploads.
      await unlink(path.join(UPLOAD_DIR, path.basename(res.url))).catch(() => {});
    }
  });
});

describe('ACCEPTED_TYPES', () => {
  it('is a non-empty allow-list', () => {
    expect(ACCEPTED_TYPES.length).toBeGreaterThan(0);
    expect(ACCEPTED_TYPES).toContain('image/svg+xml');
  });
});
