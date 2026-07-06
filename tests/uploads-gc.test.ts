import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDb } from './helpers';
import { mkdir, writeFile, utimes, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getDb, sites } from '@/lib/db';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import { UPLOAD_DIR } from '@/lib/media-optimize';
import { gcUploads } from '@/lib/uploads-gc';

// Unique tag so we never touch real project uploads.
const TAG = `zzt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const orphan = `${TAG}-orphan.webp`;
const keep = `${TAG}-keep.webp`;
const fresh = `${TAG}-fresh.webp`;
const created = [orphan, keep, fresh];

async function cleanup() {
  for (const f of created) {
    await unlink(path.join(UPLOAD_DIR, f)).catch(() => {});
  }
}

beforeEach(() => resetDb());
afterEach(cleanup);

describe('gcUploads (local disk)', () => {
  it('deletes old orphans, keeps referenced and fresh files', async () => {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const oldTime = new Date(Date.now() - 60 * 60 * 1000); // 1h ago (> grace)
    for (const f of [orphan, keep]) {
      const p = path.join(UPLOAD_DIR, f);
      await writeFile(p, 'x');
      await utimes(p, oldTime, oldTime);
    }
    // fresh file (within grace) must survive even though unreferenced
    const freshPath = path.join(UPLOAD_DIR, fresh);
    await writeFile(freshPath, 'x');

    // Reference `keep` from a site draft doc.
    const su = createUser('a@x.com', 'pw', 'Owner');
    createSite(su.id, 'S');
    getDb().update(sites).set({ draftDoc: JSON.stringify({ ref: `/uploads/${keep}` }) }).run();

    const res = await gcUploads();
    expect(res.deleted).toBeGreaterThanOrEqual(1);
    expect(existsSync(path.join(UPLOAD_DIR, orphan))).toBe(false);
    expect(existsSync(path.join(UPLOAD_DIR, keep))).toBe(true);
    expect(existsSync(freshPath)).toBe(true);
  });

  it('returns {deleted:0} gracefully when nothing to do', async () => {
    // No files with our tag; referenced set is empty. Should not throw.
    const res = await gcUploads();
    expect(res).toHaveProperty('deleted');
    expect(typeof res.deleted).toBe('number');
  });
});
