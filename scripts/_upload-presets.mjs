// Upload generated preset art (public/media/generated/presets/*.webp) to the R2
// bucket, preserving the path relative to public/ so the R2 key matches what
// presetArtUrl() / NEXT_PUBLIC_MEDIA_BASE_URL resolves to in the app:
//
//   public/media/generated/presets/arena-cover.webp
//     -> r2://<bucket>/media/generated/presets/arena-cover.webp
//
//   node scripts/_upload-presets.mjs
// Env: DIR (default public/media/generated/presets). Reads R2_* from .env.local.

import fs from 'node:fs';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';

// Minimal .env.local loader (KEY=VALUE, ignores comments/quotes).
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('[upload] R2 not configured in .env.local'); process.exit(1);
}

const DIR = process.env.DIR || path.join('public', 'media', 'generated', 'presets');
const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };

const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

// Recursively collect files under DIR.
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = walk(DIR);
if (!files.length) { console.error(`[upload] no files in ${DIR}`); process.exit(1); }

let ok = 0;
for (const abs of files) {
  // Key = path relative to public/, forward slashes (e.g. media/generated/presets/arena-cover.webp).
  const key = path.relative('public', abs).split(path.sep).join('/');
  const ext = abs.split('.').pop().toLowerCase();
  const body = fs.readFileSync(abs);
  const res = await client.fetch(`${endpoint}/${encodeURI(key)}`, {
    method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': CT[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' },
  });
  if (res.ok) { ok++; console.log(`  ✓ ${key} (${(body.length / 1024).toFixed(0)} KB)`); }
  else console.log(`  ✗ ${key}: HTTP ${res.status}`);
}
console.log(`\nUploaded ${ok}/${files.length} to r2://${R2_BUCKET}/`);
