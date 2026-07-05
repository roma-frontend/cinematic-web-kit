import 'server-only';

// Server-side media optimization used by the upload API. Every image/video
// that enters the platform is transcoded to a web-optimized format via the
// bundled ffmpeg (ffmpeg-static) — the same engine the media pipeline uses:
//   images → .webp (quality 80, max 1600px)
//   videos → .webm (VP9 CRF 34, max 1280px) + a JPG poster
// SVG is passed through untouched (already a compact vector).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, unlink, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { r2Configured, r2Put, R2_PUBLIC_BASE, contentTypeFor } from '@/lib/storage';

const execFileAsync = promisify(execFile);

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Turn a produced local file into a public URL. With Cloudflare R2 configured
 * the file is uploaded to R2 (key `uploads/<name>`) and removed locally, and the
 * public R2 URL is returned; otherwise the local `/uploads/<name>` path is used.
 */
async function finalize(localAbsPath: string, name: string): Promise<string> {
  if (r2Configured()) {
    const buf = await readFile(localAbsPath);
    await r2Put(`uploads/${name}`, buf, contentTypeFor(name));
    await unlink(localAbsPath).catch(() => {});
    return `${R2_PUBLIC_BASE}/uploads/${name}`;
  }
  return `/uploads/${name}`;
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
export const ACCEPTED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, 'image/svg+xml'];

async function resolveFfmpeg(): Promise<string> {
  try {
    const mod = await import('ffmpeg-static');
    const bin = (mod.default as unknown as string) || (mod as unknown as string);
    if (bin && existsSync(bin)) return bin;
  } catch { /* fall through */ }
  return 'ffmpeg';
}

export interface OptimizeResult {
  url: string;
  poster?: string;
  kind: 'image' | 'video' | 'raw';
  originalBytes: number;
  optimizedBytes: number;
}

const rand = () => Math.random().toString(36).slice(2, 8);

/**
 * Optimize an uploaded file. Returns the public URL(s) under /uploads and the
 * before/after byte sizes. Falls back to storing the original if ffmpeg fails.
 */
export async function optimizeUpload(file: File): Promise<OptimizeResult> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  const originalBytes = buf.length;
  const base = `up-${Date.now().toString(36)}-${rand()}`;

  // SVG: store as-is.
  if (file.type === 'image/svg+xml') {
    const out = path.join(UPLOAD_DIR, `${base}.svg`);
    await writeFile(out, buf);
    return { url: await finalize(out, `${base}.svg`), kind: 'raw', originalBytes, optimizedBytes: originalBytes };
  }

  const isVideo = VIDEO_TYPES.includes(file.type);
  const isImage = IMAGE_TYPES.includes(file.type);
  const srcExt = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const tmp = path.join(tmpdir(), `${base}.${srcExt}`);
  await writeFile(tmp, buf);
  const ffmpeg = await resolveFfmpeg();

  try {
    if (isImage) {
      const out = path.join(UPLOAD_DIR, `${base}.webp`);
      await execFileAsync(ffmpeg, [
        '-y', '-i', tmp,
        '-vf', "scale='min(1600,iw)':-2",
        '-c:v', 'libwebp', '-quality', '80',
        out,
      ], { maxBuffer: 1024 * 1024 * 64 });
      const optimizedBytes = (await stat(out)).size;
      return { url: await finalize(out, `${base}.webp`), kind: 'image', originalBytes, optimizedBytes };
    }

    if (isVideo) {
      const out = path.join(UPLOAD_DIR, `${base}.webm`);
      const poster = path.join(UPLOAD_DIR, `${base}-poster.jpg`);
      await execFileAsync(ffmpeg, [
        '-y', '-i', tmp,
        '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0',
        '-deadline', 'good', '-cpu-used', '4',
        '-pix_fmt', 'yuv420p', '-an',
        '-vf', "scale='min(1280,iw)':-2",
        out,
      ], { maxBuffer: 1024 * 1024 * 128 });
      try {
        await execFileAsync(ffmpeg, [
          '-y', '-i', tmp,
          '-vf', "thumbnail=100,scale='min(1280,iw)':-2",
          '-frames:v', '1', poster,
        ], { maxBuffer: 1024 * 1024 * 64 });
      } catch { /* poster is best-effort */ }
      const optimizedBytes = (await stat(out)).size;
      const posterUrl = existsSync(poster) ? await finalize(poster, `${base}-poster.jpg`) : undefined;
      return { url: await finalize(out, `${base}.webm`), poster: posterUrl, kind: 'video', originalBytes, optimizedBytes };
    }

    // Unknown but accepted → store raw.
    const out = path.join(UPLOAD_DIR, `${base}.${srcExt}`);
    await writeFile(out, buf);
    return { url: await finalize(out, `${base}.${srcExt}`), kind: 'raw', originalBytes, optimizedBytes: originalBytes };
  } catch {
    // ffmpeg unavailable/failed → keep the original so uploads never hard-fail.
    const out = path.join(UPLOAD_DIR, `${base}.${srcExt}`);
    await writeFile(out, await readFile(tmp));
    return { url: await finalize(out, `${base}.${srcExt}`), kind: 'raw', originalBytes, optimizedBytes: originalBytes };
  } finally {
    await unlink(tmp).catch(() => {});
  }
}
