import { NextResponse } from 'next/server';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { requireSuperadmin, forbidden } from '@/lib/api-guard';

export const runtime = 'nodejs';

// Imports a site-config bundle ({ site, media }) produced by /api/export,
// overwriting data/site.json and data/media.json. Note: this does NOT restore
// the actual video files under public/ — those must be present already.
// LOCAL/dev use only.

// Structural validation: a malformed bundle could break site rendering, so we
// reject shapes that don't match the expected schema before writing to disk.
// (Kept dependency-free — no zod — to match the rest of the codebase.)

const isStr = (v: unknown): v is string => typeof v === 'string';
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function validateMediaItem(item: unknown): string | null {
  if (!isObj(item)) return 'media item must be an object';
  if (!isStr(item.id) || item.id.length === 0) return 'media item missing string "id"';
  if (!isStr(item.src) || item.src.length === 0) return `media item "${item.id}" missing string "src"`;
  if (!isStr(item.section)) return `media item "${item.id}" missing string "section"`;
  return null;
}

function validateSite(site: unknown): string | null {
  if (!isObj(site)) return 'site must be an object';
  // The renderer depends on `theme` (string) and `layout` (array of section ids).
  if (!isStr(site.theme)) return 'site missing string "theme"';
  if (!Array.isArray(site.layout)) return 'site missing array "layout"';
  if (!site.layout.every((s) => isStr(s))) return 'site.layout must be an array of strings';
  return null;
}

export async function POST(request: Request) {
  if (!(await requireSuperadmin())) return forbidden();
  let bundle: { site?: unknown; media?: unknown };
  try {
    bundle = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dir = path.join(process.cwd(), 'data');
  const results: string[] = [];

  if (bundle.media !== undefined) {
    if (!Array.isArray(bundle.media)) {
      return NextResponse.json({ error: 'media must be an array' }, { status: 400 });
    }
    for (const item of bundle.media) {
      const err = validateMediaItem(item);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }
    await writeFile(path.join(dir, 'media.json'), `${JSON.stringify(bundle.media, null, 2)}\n`, 'utf8');
    results.push('media');
  }

  if (bundle.site !== undefined) {
    const err = validateSite(bundle.site);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    await writeFile(path.join(dir, 'site.json'), `${JSON.stringify(bundle.site, null, 2)}\n`, 'utf8');
    results.push('site');
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'Nothing to import (expected site and/or media)' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, imported: results });
}
