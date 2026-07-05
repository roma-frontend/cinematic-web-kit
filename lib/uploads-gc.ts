import 'server-only';
import path from 'node:path';
import { readdir, stat, unlink, readFile } from 'node:fs/promises';
import { getDb, sites, siteMaterials } from '@/lib/db';
import { UPLOAD_DIR } from '@/lib/media-optimize';
import { r2Configured, r2List, r2Delete } from '@/lib/storage';

// Garbage-collect orphaned uploads: when an image/video is replaced in the
// builder, the old file is no longer referenced by any doc — so we delete it
// from disk. We keep any file still referenced by ANY site (draft OR published),
// materials, or the demo data files, and skip very recent files (grace window)
// so a freshly uploaded file isn't removed before its doc is saved.

const UPLOAD_RE = /\/uploads\/[A-Za-z0-9._-]+/g;
const GRACE_MS = 10 * 60 * 1000; // don't touch files newer than 10 min

function refsFrom(text: string | null | undefined, set: Set<string>) {
  if (!text) return;
  const m = text.match(UPLOAD_RE);
  if (m) for (const u of m) set.add(path.basename(u));
}

/** Collect the basenames of every /uploads file still referenced anywhere. */
async function collectReferenced(): Promise<Set<string>> {
  const set = new Set<string>();
  const db = getDb();

  for (const s of db.select({ d: sites.draftDoc, p: sites.publishedDoc }).from(sites).all()) {
    refsFrom(s.d, set);
    refsFrom(s.p, set);
  }
  for (const m of db.select({ b: siteMaterials.body, u: siteMaterials.url }).from(siteMaterials).all()) {
    refsFrom(m.b, set);
    refsFrom(m.u, set);
  }
  // Demo/content data files that may reference uploads.
  for (const f of ['media.json', 'landing.json', 'site.json', 'builder.json']) {
    try {
      refsFrom(await readFile(path.join(process.cwd(), 'data', f), 'utf8'), set);
    } catch {
      /* file may not exist */
    }
  }
  return set;
}

/** Delete upload files no longer referenced. Fire-and-forget; never throws. */
export async function gcUploads(): Promise<{ deleted: number }> {
  try {
    const referenced = await collectReferenced();
    const now = Date.now();

    // R2-backed storage: sweep the bucket's uploads/ prefix.
    if (r2Configured()) {
      let deleted = 0;
      for (const obj of await r2List('uploads/')) {
        const name = path.basename(obj.key);
        if (referenced.has(name)) continue;
        if (now - obj.lastModified < GRACE_MS) continue;
        await r2Delete(obj.key);
        deleted++;
      }
      return { deleted };
    }

    // Local disk fallback.
    let files: string[] = [];
    try {
      files = await readdir(UPLOAD_DIR);
    } catch {
      return { deleted: 0 }; // no upload dir yet
    }
    let deleted = 0;
    for (const name of files) {
      if (referenced.has(name)) continue;
      const full = path.join(UPLOAD_DIR, name);
      try {
        const st = await stat(full);
        if (!st.isFile()) continue;
        if (now - st.mtimeMs < GRACE_MS) continue; // too fresh — may be in-flight
        await unlink(full);
        deleted++;
      } catch {
        /* ignore individual file errors */
      }
    }
    return { deleted };
  } catch {
    return { deleted: 0 };
  }
}
