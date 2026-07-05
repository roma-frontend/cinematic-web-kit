// Shared helpers for the media pipeline.
//
// Flow: generate (muapi.ai text→video) → download → optimize (ffmpeg → .webm +
// poster) → import (write paths into data/media.json). Each step is a plain
// function so run.mjs can compose them; callers can skip generation with --from
// when they already have a local clip.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const execFileAsync = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const RAW_DIR = path.join(HERE, '.raw');
export const OUT_DIR = path.join(ROOT, 'public', 'media', 'generated');
export const DATA_FILE = path.join(ROOT, 'data', 'media.json');

const MUAPI_BASE = process.env.MUAPI_BASE || 'https://api.muapi.ai';
const DEFAULT_VIDEO_ENDPOINT = process.env.MUAPI_VIDEO_ENDPOINT || 'pixverse-v5.5-t2v';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolve ffmpeg: prefer bundled `ffmpeg-static`, fall back to system `ffmpeg`. */
export async function resolveFfmpeg() {
  try {
    const mod = await import('ffmpeg-static');
    const bin = mod.default || mod;
    if (bin && existsSync(bin)) return bin;
  } catch {
    /* fall through */
  }
  return 'ffmpeg';
}

/**
 * Submit a text→video job to muapi.ai and poll until ready. Returns the remote
 * video URL. Requires MUAPI_KEY in the environment.
 */
export async function generateVideo({ prompt, negativePrompt, model, aspectRatio = '16:9', duration, apiKey }) {
  const key = apiKey || process.env.MUAPI_KEY;
  if (!key) throw new Error('MUAPI_KEY is not set. Export your muapi.ai API key first (see .env.example).');
  if (!/^[\x20-\x7E]+$/.test(key)) {
    throw new Error('MUAPI_KEY contains non-ASCII characters — it looks corrupted (bad shell paste?). Re-set it in .env.local.');
  }
  if (!prompt) throw new Error('A --prompt is required to generate a video (or use --from <file>).');

  const endpoint = model || DEFAULT_VIDEO_ENDPOINT;
  const url = `${MUAPI_BASE}/api/v1/${endpoint}`;
  const payload = { prompt, aspect_ratio: aspectRatio };
  if (negativePrompt) payload.negative_prompt = negativePrompt;
  if (duration) payload.duration = duration;

  console.log(`[generate] POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`muapi submit failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
  }
  const submit = await res.json();
  const requestId = submit.request_id || submit.id;
  const direct = submit.outputs?.[0] || submit.url;
  if (!requestId && direct) return direct;
  if (!requestId) throw new Error('muapi did not return a request_id.');

  console.log(`[generate] polling predictions/${requestId} ...`);
  for (let attempt = 1; attempt <= 900; attempt++) {
    await sleep(2000);
    const pollRes = await fetch(`${MUAPI_BASE}/api/v1/predictions/${requestId}/result`, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    });
    if (!pollRes.ok) {
      if (pollRes.status >= 500) continue;
      throw new Error(`muapi poll failed: ${pollRes.status}`);
    }
    const data = await pollRes.json();
    const status = String(data.status || '').toLowerCase();
    if (['completed', 'succeeded', 'success'].includes(status)) {
      const videoUrl = data.outputs?.[0] || data.url || data.output?.url;
      if (!videoUrl) throw new Error('Generation completed but no video URL was returned.');
      return videoUrl;
    }
    if (['failed', 'error'].includes(status)) {
      throw new Error(`Generation failed: ${data.error || 'unknown error'}`);
    }
    if (attempt % 15 === 0) console.log(`[generate] still ${status || 'processing'} (attempt ${attempt})`);
  }
  throw new Error('Generation timed out.');
}

/** Download a remote URL to a local file. */
export async function download(url, destPath) {
  await mkdir(path.dirname(destPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return destPath;
}

/**
 * Optimize a source video into a web-ready VP9 `.webm` plus a JPG poster.
 * Returns { webm, poster } absolute paths.
 */
export async function optimize(inputPath, slug, { keepAudio = false } = {}) {
  if (!existsSync(inputPath)) throw new Error(`Input video not found: ${inputPath}`);
  await mkdir(OUT_DIR, { recursive: true });
  const ffmpeg = await resolveFfmpeg();
  const webm = path.join(OUT_DIR, `${slug}.webm`);
  const mp4 = path.join(OUT_DIR, `${slug}.mp4`);
  const poster = path.join(OUT_DIR, `${slug}-poster.jpg`);

  // Audio: strip by default (decorative loops), or transcode when --audio is set.
  const webmAudio = keepAudio ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an'];
  const mp4Audio = keepAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an'];

  console.log(`[optimize] ${slug}.webm (VP9, CRF 34${keepAudio ? ', + audio' : ''})`);
  await execFileAsync(ffmpeg, [
    '-y', '-i', inputPath,
    '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0',
    '-deadline', 'good', '-cpu-used', '2',
    '-pix_fmt', 'yuv420p', ...webmAudio,
    '-vf', "scale='min(1280,iw)':-2",
    webm,
  ], { maxBuffer: 1024 * 1024 * 64 });

  // MP4 (H.264) fallback for Safari / browsers without VP9-in-WebM.
  console.log(`[optimize] ${slug}.mp4 (H.264 fallback)`);
  try {
    await execFileAsync(ffmpeg, [
      '-y', '-i', inputPath,
      '-c:v', 'libx264', '-crf', '24', '-preset', 'medium',
      '-pix_fmt', 'yuv420p', ...mp4Audio, '-movflags', '+faststart',
      '-vf', "scale='min(1280,iw)':-2",
      mp4,
    ], { maxBuffer: 1024 * 1024 * 64 });
  } catch (err) {
    console.warn(`[optimize] mp4 fallback skipped: ${err.message}`);
  }

  // Smart poster: pick the most representative frame (ffmpeg `thumbnail`
  // analyses a window of frames) instead of a possibly-black first frame.
  console.log(`[optimize] ${slug}-poster.jpg (smart thumbnail)`);
  try {
    await execFileAsync(ffmpeg, [
      '-y', '-i', inputPath,
      '-vf', "thumbnail=100,scale='min(1280,iw)':-2",
      '-frames:v', '1', '-q:v', '3',
      poster,
    ], { maxBuffer: 1024 * 1024 * 64 });
  } catch {
    // Fall back to the first frame if the thumbnail filter is unavailable.
    await execFileAsync(ffmpeg, ['-y', '-i', inputPath, '-vframes', '1', '-q:v', '4', poster], {
      maxBuffer: 1024 * 1024 * 64,
    });
  }

  return { webm, mp4: existsSync(mp4) ? mp4 : undefined, poster };
}

/** Site-relative URL for a file under public/. */
export function toPublicUrl(absPath) {
  const rel = path.relative(path.join(ROOT, 'public'), absPath).split(path.sep).join('/');
  return `/${rel}`;
}

/** Upsert a media entry into data/media.json (keyed by id). */
export async function importToData(entry) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  let list = [];
  if (existsSync(DATA_FILE)) {
    try { list = JSON.parse(await readFile(DATA_FILE, 'utf8')); } catch { list = []; }
    if (!Array.isArray(list)) list = [];
  }
  const idx = list.findIndex((m) => m.id === entry.id);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  await writeFile(DATA_FILE, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
  console.log(`[import] ${idx >= 0 ? 'updated' : 'added'} "${entry.id}" in ${path.relative(ROOT, DATA_FILE)}`);
  return list;
}

export function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'clip';
}
