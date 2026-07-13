// Optimize the "How it works" step screenshots to .webp and upload them to
// Cloudflare R2, mirroring lib/storage.ts (aws4fetch SigV4 + node:https so R2
// gets an explicit Content-Length). Prints the public URLs on success.
//
//   node scripts/upload-steps.mjs
//
// Reads R2_* credentials from .env.local.

import { AwsClient } from 'aws4fetch';
import { request as httpsRequest } from 'node:https';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'step-shots');
const PREFIX = 'generated/steps';

// Minimal .env.local loader (KEY=VALUE, ignores comments/blank lines).
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL,
} = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE_URL) {
  console.error('Missing R2_* env vars in .env.local');
  process.exit(1);
}
const PUBLIC_BASE = R2_PUBLIC_BASE_URL.replace(/\/$/, '');
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

async function r2Put(key, body, contentType) {
  const url = `${endpoint}/${encodeURI(key)}`;
  const bytes = Buffer.from(body);
  const signed = await aws.sign(url, { method: 'PUT', body: new Uint8Array(bytes), headers: { 'content-type': contentType, 'cache-control': CACHE_CONTROL } });
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

const files = fs.readdirSync(IN).filter((f) => f.endsWith('.png')).sort();
for (const file of files) {
  const name = file.replace(/\.png$/, '.webp');
  const webp = await sharp(path.join(IN, file))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = `${PREFIX}/${name}`;
  await r2Put(key, webp, 'image/webp');
  console.log(`\u2713 ${key}  (${(webp.length / 1024).toFixed(0)} KB)  ->  ${PUBLIC_BASE}/${key}`);
}
console.log('\nDone.');
