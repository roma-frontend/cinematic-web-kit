import 'server-only';
import { AwsClient } from 'aws4fetch';
import { request as httpsRequest } from 'node:https';

// Optional Cloudflare R2 (S3-compatible) object storage for uploads. When the
// R2_* env vars are set, media is stored in R2 and served from R2_PUBLIC_BASE_URL
// (a public bucket URL or a custom domain). Otherwise everything falls back to
// the local public/uploads folder — fully backward compatible.

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE_URL,
} = process.env;

export function r2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_BASE_URL);
}

/** Public base URL (no trailing slash) for serving R2 objects. */
export const R2_PUBLIC_BASE = (R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');

let _client: AwsClient | null = null;
function client(): AwsClient {
  _client ??= new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID as string,
    secretAccessKey: R2_SECRET_ACCESS_KEY as string,
    region: 'auto',
    service: 's3',
  });
  return _client;
}

const endpoint = () => `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;

export async function r2Put(key: string, body: Buffer, contentType: string): Promise<void> {
  const url = `${endpoint()}/${encodeURI(key)}`;
  const bytes = Buffer.from(body);
  // Sign with aws4fetch (computes the SigV4 authorization + x-amz-content-sha256
  // over the body), then send via node:https instead of fetch. Next.js patches
  // the global fetch and drops the Content-Length for non-trivial bodies, which
  // makes R2 reject the PUT with "411 Length Required" (uploads over a few
  // hundred KB silently fail). node:https lets us set Content-Length explicitly.
  const signed = await client().sign(url, {
    method: 'PUT',
    body: new Uint8Array(bytes),
    headers: { 'content-type': contentType },
  });
  const headers: Record<string, string> = { 'content-length': String(bytes.length) };
  signed.headers.forEach((value, name) => { headers[name] = value; });

  const u = new URL(url);
  await new Promise<void>((resolve, reject) => {
    const req = httpsRequest(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'PUT', headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c as Buffer));
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) resolve();
          else reject(new Error(`R2 PUT failed (${status}) ${Buffer.concat(chunks).toString('utf8').slice(0, 200)}`));
        });
      },
    );
    req.on('error', reject);
    req.end(bytes);
  });
}

export async function r2Delete(key: string): Promise<void> {
  await client().fetch(`${endpoint()}/${encodeURI(key)}`, { method: 'DELETE' }).catch(() => {});
}

export interface R2Object { key: string; lastModified: number }

/** List objects under a prefix (paginated). */
export async function r2List(prefix: string): Promise<R2Object[]> {
  const out: R2Object[] = [];
  let token: string | undefined;
  do {
    const url = new URL(endpoint());
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefix);
    if (token) url.searchParams.set('continuation-token', token);
    const res = await client().fetch(url.toString());
    if (!res.ok) break;
    const xml = await res.text();
    for (const block of xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? []) {
      const key = block.match(/<Key>([^<]+)<\/Key>/)?.[1];
      const lm = block.match(/<LastModified>([^<]+)<\/LastModified>/)?.[1];
      if (key) out.push({ key, lastModified: lm ? Date.parse(lm) : 0 });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1]
      : undefined;
  } while (token);
  return out;
}

const CT: Record<string, string> = {
  webp: 'image/webp', webm: 'video/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4',
};
export function contentTypeFor(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return CT[ext] || 'application/octet-stream';
}

/** Non-secret storage status for the admin UI. */
export function storageInfo(): { mode: 'r2'; bucket: string; publicBase: string } | { mode: 'local' } {
  return r2Configured()
    ? { mode: 'r2', bucket: R2_BUCKET as string, publicBase: R2_PUBLIC_BASE }
    : { mode: 'local' };
}
