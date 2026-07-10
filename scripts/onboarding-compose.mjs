#!/usr/bin/env node
// Build final onboarding videos: screen capture timeline + presenter PiP in the
// bottom-right corner. Assets are pulled from R2, composed with ffmpeg, uploaded
// back to R2, then the temp build folder is removed unless KEEP_TEMP=1.

import './media-pipeline/load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { AwsClient } from 'aws4fetch';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');

const OUT = process.env.OUT || path.join(os.tmpdir(), `cwk-onboarding-compose-${Date.now()}`);
const LOCALES = (process.env.LOCALES || 'ru,en,hy').split(',').map((s) => s.trim()).filter(Boolean);
const THEME = process.env.THEME || 'light';
const KEEP_TEMP = process.env.KEEP_TEMP === '1';
const UPLOAD = process.env.UPLOAD !== '0';
const PREFIX = 'media/onboarding-video';
const FINAL_PREFIX = `${PREFIX}/assembled`;
const WIDTH = 1920;
const HEIGHT = 1080;

const LOCALE_DURATION = { ru: 89.36, en: 94.38, hy: 89.0 };
const SCENES = [
  { id: 'dashboard-trial', seconds: 10 },
  { id: 'quick-start', seconds: 10 },
  { id: 'ai-wizard', seconds: 14 },
  { id: 'builder-ai', seconds: 15 },
  { id: 'builder-palette', seconds: 12 },
  { id: 'publish', seconds: 11 },
  { id: 'submissions', seconds: 8 },
  { id: 'members', seconds: 7 },
  { id: 'billing', seconds: 12 },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (typeof args.locales === 'string') process.env.LOCALES = args.locales;
if (typeof args.theme === 'string') process.env.THEME = args.theme;
if (args['no-upload']) process.env.UPLOAD = '0';

function r2Client() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('R2_* env vars are required');
  }
  const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
  return { client, endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}` };
}

const { client, endpoint } = r2Client();
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const contentType = (file) => file.endsWith('.mp4') ? 'video/mp4' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream';

async function download(key, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const res = await client.fetch(`${endpoint}/${encodeURI(key)}`, { method: 'GET' });
  if (!res.ok) throw new Error(`R2 download failed for ${key}: HTTP ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`  ↓ ${key} (${kb(fs.statSync(file).size)})`);
}

async function upload(file, key) {
  const body = fs.readFileSync(file);
  const res = await client.fetch(`${endpoint}/${encodeURI(key)}`, {
    method: 'PUT',
    body: new Uint8Array(body),
    headers: { 'content-type': contentType(file) },
  });
  if (!res.ok) throw new Error(`R2 upload failed for ${key}: HTTP ${res.status}`);
  console.log(`  ✓ ${key} (${mb(body.length)})`);
}

function assetExt(sceneId) {
  return ['dashboard-trial', 'quick-start', 'submissions', 'members', 'billing'].includes(sceneId) ? 'png' : 'mp4';
}

function runFfmpeg(args, label) {
  const r = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${label}`);
}

function buildScreen(locale, files, outFile) {
  const total = LOCALE_DURATION[locale] || 90;
  const declared = SCENES.reduce((sum, s) => sum + s.seconds, 0);
  const scale = total / declared;
  const inputs = [];
  const filters = [];
  SCENES.forEach((scene, i) => {
    const seconds = Math.max(3, scene.seconds * scale);
    const file = files[scene.id];
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png') inputs.push('-loop', '1', '-t', String(seconds), '-i', file);
    else inputs.push('-stream_loop', '-1', '-t', String(seconds), '-i', file);
    filters.push(`[${i}:v]fps=30,scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,format=yuv420p[v${i}]`);
  });
  const concatInputs = SCENES.map((_, i) => `[v${i}]`).join('');
  filters.push(`${concatInputs}concat=n=${SCENES.length}:v=1:a=0,trim=duration=${total.toFixed(2)},setpts=PTS-STARTPTS[screen]`);
  runFfmpeg([
    '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[screen]',
    '-an',
    '-c:v', 'libx264',
    '-crf', '27',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outFile,
  ], `screen ${locale}`);
}

function buildComposite(locale, screenFile, presenterFile, outFile) {
  const total = LOCALE_DURATION[locale] || 90;
  runFfmpeg([
    '-y',
    '-i', screenFile,
    '-i', presenterFile,
    '-filter_complex',
    `[0:v]scale=${WIDTH}:${HEIGHT},setsar=1[bg];` +
    `[1:v]scale=-2:340,format=rgba,` +
    `split[pip][masksrc];` +
    `[masksrc]alphaextract,geq=lum='if(lte(pow(X-W/2,2)/pow(W/2,2)+pow(Y-H/2,2)/pow(H/2,2),1),255,0)'[mask];` +
    `[pip][mask]alphamerge[pipr];` +
    `[bg][pipr]overlay=W-w-54:H-h-46:format=auto,format=yuv420p[v]`,
    '-map', '[v]',
    '-map', '1:a?',
    '-t', String(total),
    '-c:v', 'libx264',
    '-crf', '24',
    '-preset', 'veryfast',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outFile,
  ], `composite ${locale}`);
}

try {
  fs.mkdirSync(OUT, { recursive: true });
  for (const locale of LOCALES) {
    console.log(`» ${locale}`);
    const locDir = path.join(OUT, locale);
    fs.mkdirSync(locDir, { recursive: true });
    const presenter = path.join(locDir, `presenter_${locale}.mp4`);
    await download(`${PREFIX}/final/onboarding_${locale}.mp4`, presenter);

    const files = {};
    for (const scene of SCENES) {
      const ext = assetExt(scene.id);
      const key = `${PREFIX}/${locale}/${THEME}/${scene.id}.${ext}`;
      const file = path.join(locDir, `${scene.id}.${ext}`);
      await download(key, file);
      files[scene.id] = file;
    }

    const screen = path.join(locDir, `screen_${locale}_${THEME}.mp4`);
    const assembled = path.join(locDir, `onboarding_${locale}_${THEME}_assembled.mp4`);
    buildScreen(locale, files, screen);
    buildComposite(locale, screen, presenter, assembled);
    if (UPLOAD) await upload(assembled, `${FINAL_PREFIX}/onboarding_${locale}_${THEME}.mp4`);
  }
  console.log('\n[compose] done');
} catch (err) {
  console.error(`\n[compose] failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  if (!KEEP_TEMP) fs.rmSync(OUT, { recursive: true, force: true });
}

