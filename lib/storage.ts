import 'server-only';
import { AwsClient } from 'aws4fetch';

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
  const res = await client().fetch(`${endpoint()}/${encodeURI(key)}`, {
    method: 'PUT',
    body: new Uint8Array(body),
    headers: { 'content-type': contentType },
  });
  if (!res.ok) throw new Error(`R2 PUT failed (${res.status})`);
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
