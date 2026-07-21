// Upload generated tutorial media (public/media/tutorial-shot-*) to the R2
// bucket under the `media/` prefix, so production (NEXT_PUBLIC_MEDIA_BASE_URL →
// R2) serves the real screenshots/clips. Reads R2_* creds from .env.local.
//
//   node scripts/_upload-media.mjs
// Env: GLOB (default tutorial-shot-*), OUT (default public/media)

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

const OUT = process.env.OUT || path.join('public', 'media');
const PREFIX = process.env.GLOB || 'tutorial-shot-';
const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };

const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

const files = fs.readdirSync(OUT).filter((f) => f.startsWith(PREFIX));
if (!files.length) { console.error(`[upload] no files matching ${PREFIX}* in ${OUT}`); process.exit(1); }

let ok = 0;
for (const f of files) {
  const ext = f.split('.').pop().toLowerCase();
  const key = `media/${f}`;
  const body = fs.readFileSync(path.join(OUT, f));
  const res = await client.fetch(`${endpoint}/${encodeURI(key)}`, {
    method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': CT[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' },
  });
  if (res.ok) { ok++; console.log(`  ✓ ${key} (${(body.length / 1024).toFixed(0)} KB)`); }
  else console.log(`  ✗ ${key}: HTTP ${res.status}`);
}
console.log(`\nUploaded ${ok}/${files.length} to r2://${R2_BUCKET}/media/`);
