import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';

// r2Put sends its PUT via node:https rather than fetch — Next.js patches the
// global fetch and drops the Content-Length for non-trivial bodies, which makes
// R2 reject the upload with 411. Mock node:https with a controllable status.
let httpsStatus = 200;
let lastHttpsOptions: { method?: string; hostname?: string; path?: string; headers?: Record<string, string> } | null = null;
vi.mock('node:https', () => ({
  request: (options: { method?: string; hostname?: string; path?: string; headers?: Record<string, string> }, cb: (res: EventEmitter & { statusCode: number }) => void) => {
    lastHttpsOptions = options;
    const req = new EventEmitter() as EventEmitter & { end: (b?: unknown) => void };
    req.end = () => {
      const res = Object.assign(new EventEmitter(), { statusCode: httpsStatus });
      cb(res);
      res.emit('data', Buffer.from('body'));
      res.emit('end');
    };
    return req;
  },
}));

const OLD_ENV = { ...process.env };

function setR2Env() {
  process.env.R2_ACCOUNT_ID = 'acct123';
  process.env.R2_ACCESS_KEY_ID = 'akid';
  process.env.R2_SECRET_ACCESS_KEY = 'secret';
  process.env.R2_BUCKET = 'mybucket';
  process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com/';
}

function clearR2Env() {
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL']) {
    delete process.env[k];
  }
}

const fakeRes = (body: string, ok = true, status = 200) => ({ ok, status, text: async () => body });

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.unstubAllGlobals();
});

describe('contentTypeFor (all branches)', () => {
  it('maps every known extension + fallback', async () => {
    const { contentTypeFor } = await import('@/lib/storage');
    expect(contentTypeFor('a.webp')).toBe('image/webp');
    expect(contentTypeFor('a.webm')).toBe('video/webm');
    expect(contentTypeFor('a.jpg')).toBe('image/jpeg');
    expect(contentTypeFor('a.jpeg')).toBe('image/jpeg');
    expect(contentTypeFor('a.png')).toBe('image/png');
    expect(contentTypeFor('a.gif')).toBe('image/gif');
    expect(contentTypeFor('a.svg')).toBe('image/svg+xml');
    expect(contentTypeFor('a.mp4')).toBe('video/mp4');
    expect(contentTypeFor('a.unknown')).toBe('application/octet-stream');
    expect(contentTypeFor('noext')).toBe('application/octet-stream');
  });
});

describe('unconfigured storage', () => {
  it('r2Configured false and storageInfo local', async () => {
    clearR2Env();
    const { r2Configured, storageInfo } = await import('@/lib/storage');
    expect(r2Configured()).toBe(false);
    expect(storageInfo()).toEqual({ mode: 'local' });
  });
});

describe('configured storage', () => {
  it('reports r2 mode + trimmed public base', async () => {
    setR2Env();
    const { r2Configured, storageInfo, R2_PUBLIC_BASE } = await import('@/lib/storage');
    expect(r2Configured()).toBe(true);
    expect(R2_PUBLIC_BASE).toBe('https://cdn.example.com');
    expect(storageInfo()).toEqual({ mode: 'r2', bucket: 'mybucket', publicBase: 'https://cdn.example.com' });
  });

  it('r2Put issues a signed PUT', async () => {
    setR2Env();
    httpsStatus = 200;
    lastHttpsOptions = null;
    const { r2Put } = await import('@/lib/storage');
    await r2Put('uploads/a.webp', Buffer.from('data'), 'image/webp');
    expect(lastHttpsOptions?.method).toBe('PUT');
    expect(lastHttpsOptions?.hostname).toBe('acct123.r2.cloudflarestorage.com');
    expect(lastHttpsOptions?.path).toContain('/mybucket/uploads/a.webp');
    expect(lastHttpsOptions?.headers?.['content-length']).toBe('4');
    expect(lastHttpsOptions?.headers?.authorization).toContain('AWS4-HMAC-SHA256');
  });

  it('r2Put throws on non-ok', async () => {
    setR2Env();
    httpsStatus = 403;
    const { r2Put } = await import('@/lib/storage');
    await expect(r2Put('uploads/a.webp', Buffer.from('x'), 'image/webp')).rejects.toThrow('R2 PUT failed (403)');
  });

  it('r2Delete issues a DELETE and swallows errors', async () => {
    setR2Env();
    const fetchMock = vi.fn().mockResolvedValue(fakeRes('', true, 204));
    vi.stubGlobal('fetch', fetchMock);
    const { r2Delete } = await import('@/lib/storage');
    await r2Delete('uploads/a.webp');
    expect(fetchMock.mock.calls[0][0].method).toBe('DELETE');
    // error path
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    await expect(r2Delete('uploads/a.webp')).resolves.toBeUndefined();
  });

  it('r2List parses XML and paginates', async () => {
    setR2Env();
    const page1 = `<ListBucketResult>
      <Contents><Key>uploads/a.webp</Key><LastModified>2023-01-01T00:00:00.000Z</LastModified></Contents>
      <Contents><Key>uploads/b.webp</Key><LastModified>2023-01-02T00:00:00.000Z</LastModified></Contents>
      <IsTruncated>true</IsTruncated>
      <NextContinuationToken>TOKEN2</NextContinuationToken>
    </ListBucketResult>`;
    const page2 = `<ListBucketResult>
      <Contents><Key>uploads/c.webp</Key><LastModified>bad-date</LastModified></Contents>
      <IsTruncated>false</IsTruncated>
    </ListBucketResult>`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fakeRes(page1))
      .mockResolvedValueOnce(fakeRes(page2));
    vi.stubGlobal('fetch', fetchMock);
    const { r2List } = await import('@/lib/storage');
    const objs = await r2List('uploads/');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(objs.map((o) => o.key)).toEqual(['uploads/a.webp', 'uploads/b.webp', 'uploads/c.webp']);
    expect(objs[0].lastModified).toBe(Date.parse('2023-01-01T00:00:00.000Z'));
    expect(Number.isNaN(objs[2].lastModified)).toBe(true); // unparsable date → NaN
    // verify list-type query param present
    expect(fetchMock.mock.calls[0][0].url).toContain('list-type=2');
  });

  it('r2List stops when a page is not ok', async () => {
    setR2Env();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeRes('', false, 403)));
    const { r2List } = await import('@/lib/storage');
    expect(await r2List('uploads/')).toEqual([]);
  });
});
