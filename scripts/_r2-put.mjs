// Upload specific local files to explicit R2 keys.
//   node scripts/_r2-put.mjs "C:\path\file.mp4=media/builder-tutorial.ru.mp4" ...
import fs from 'node:fs';
import { AwsClient } from 'aws4fetch';
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const CT = { mp4: 'video/mp4', webm: 'video/webm', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', vtt: 'text/vtt' };
const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
for (const arg of process.argv.slice(2)) {
  const i = arg.lastIndexOf('=');
  const file = arg.slice(0, i), key = arg.slice(i + 1);
  const ext = key.split('.').pop().toLowerCase();
  const body = fs.readFileSync(file);
  const res = await client.fetch(`${endpoint}/${encodeURI(key)}`, { method: 'PUT', body: new Uint8Array(body), headers: { 'content-type': CT[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' } });
  console.log(`  ${res.ok ? '✓' : '✗'} ${key} (${(body.length / 1024).toFixed(0)} KB) ${res.status}`);
}
