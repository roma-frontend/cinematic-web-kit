// Build a short looping clip of the live landing for the hero browser mockup.
//
// Playwright's built-in video (screencast) comes out blank on this page because
// of the WebGL gradient, so we instead capture a sequence of screenshots while
// smoothly scrolling (ping-pong 0→max→0 for a seamless loop) and assemble them
// with ffmpeg into web-ready .webm + .mp4 + poster, then upload all three to R2.
//
//   npm run dev            # in another terminal
//   node scripts/hero-record.mjs
//
// Env: BASE (default http://localhost:3000), SCHEME (dark|light, default dark).

import { chromium } from '@playwright/test';
import { AwsClient } from 'aws4fetch';
import { request as httpsRequest } from 'node:https';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFfmpeg, OUT_DIR } from './media-pipeline/lib.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:3000';
const SCHEME = process.env.SCHEME === 'light' ? 'light' : 'dark';
const SLUG = 'hero-landing';
const FRAMES_DIR = path.join(ROOT, '.hero-frames');
const PREFIX = 'generated/hero';
const FRAMES = 120;
const FPS = 24;
const MAX_SCROLL = 2200;

// ---- 1. Capture a scrolling screenshot sequence -------------------------
fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await context.addInitScript((s) => { try { localStorage.setItem('theme', s); } catch { /* ignore */ } }, SCHEME);
const page = await context.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60_000 });
await page.waitForTimeout(2500); // hero entrance animations
const maxScroll = await page.evaluate((cap) => Math.min(document.body.scrollHeight - window.innerHeight, cap), MAX_SCROLL);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
for (let i = 0; i < FRAMES; i++) {
  const lin = i / (FRAMES - 1);
  const pingpong = lin < 0.5 ? lin * 2 : 2 - lin * 2; // 0 → 1 → 0
  const y = Math.round(maxScroll * easeInOut(pingpong));
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(45); // let paint settle
  await page.screenshot({ path: path.join(FRAMES_DIR, `frame-${String(i).padStart(4, '0')}.png`) });
}
await context.close();
await browser.close();
console.log(`captured ${FRAMES} frames (maxScroll=${maxScroll})`);

// ---- 2. Assemble with ffmpeg (webm + mp4 + poster) ----------------------
const ff = await resolveFfmpeg();
fs.mkdirSync(OUT_DIR, { recursive: true });
const webm = path.join(OUT_DIR, `${SLUG}.webm`);
const mp4 = path.join(OUT_DIR, `${SLUG}.mp4`);
const poster = path.join(OUT_DIR, `${SLUG}-poster.jpg`);
const input = path.join(FRAMES_DIR, 'frame-%04d.png');
const scale = "scale='min(1280,iw)':-2";
await run(ff, ['-y', '-framerate', String(FPS), '-i', input, '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-pix_fmt', 'yuv420p', '-an', '-vf', scale, webm], { maxBuffer: 1 << 26 });
await run(ff, ['-y', '-framerate', String(FPS), '-i', input, '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', '-vf', scale, mp4], { maxBuffer: 1 << 26 });
fs.copyFileSync(path.join(FRAMES_DIR, `frame-${String(Math.floor(FRAMES / 2)).padStart(4, '0')}.png`), poster.replace(/\.jpg$/, '.png'));
await run(ff, ['-y', '-i', poster.replace(/\.jpg$/, '.png'), '-q:v', '3', poster], { maxBuffer: 1 << 26 });
fs.rmSync(poster.replace(/\.jpg$/, '.png'), { force: true });
fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
console.log('assembled webm + mp4 + poster');

// ---- 3. Upload to R2 ----------------------------------------------------
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL } = process.env;
const PUBLIC_BASE = (R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
const CT = { webm: 'video/webm', mp4: 'video/mp4', jpg: 'image/jpeg' };

async function r2Put(key, buf, contentType) {
  const url = `${endpoint}/${encodeURI(key)}`;
  const bytes = Buffer.from(buf);
  const signed = await aws.sign(url, { method: 'PUT', body: new Uint8Array(bytes), headers: { 'content-type': contentType } });
  const headers = { 'content-length': String(bytes.length) };
  signed.headers.forEach((v, n) => { headers[n] = v; });
  const u = new URL(url);
  await new Promise((resolve, reject) => {
    const req = httpsRequest({ hostname: u.hostname, path: u.pathname + u.search, method: 'PUT', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const s = res.statusCode ?? 0;
        if (s >= 200 && s < 300) resolve();
        else reject(new Error(`R2 PUT ${s}: ${Buffer.concat(chunks).toString('utf8').slice(0, 200)}`));
      });
    });
    req.on('error', reject);
    req.end(bytes);
  });
}

for (const file of [webm, mp4, poster]) {
  const name = path.basename(file);
  const ext = name.split('.').pop().toLowerCase();
  const key = `${PREFIX}/${name}`;
  await r2Put(key, fs.readFileSync(file), CT[ext] || 'application/octet-stream');
  console.log(`\u2713 ${key}  (${(fs.statSync(file).size / 1024).toFixed(0)} KB)  ->  ${PUBLIC_BASE}/${key}`);
}
// R2 is the source of truth — don't leave local copies behind.
for (const file of [webm, mp4, poster]) fs.rmSync(file, { force: true });
console.log('\nDone (local copies removed).');
