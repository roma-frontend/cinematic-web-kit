import { NextResponse } from 'next/server';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

// Imports a site-config bundle ({ site, media }) produced by /api/export,
// overwriting data/site.json and data/media.json. Note: this does NOT restore
// the actual video files under public/ — those must be present already.
// LOCAL/dev use only.
export async function POST(request: Request) {
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
    await writeFile(path.join(dir, 'media.json'), `${JSON.stringify(bundle.media, null, 2)}\n`, 'utf8');
    results.push('media');
  }

  if (bundle.site !== undefined) {
    if (typeof bundle.site !== 'object' || bundle.site === null) {
      return NextResponse.json({ error: 'site must be an object' }, { status: 400 });
    }
    await writeFile(path.join(dir, 'site.json'), `${JSON.stringify(bundle.site, null, 2)}\n`, 'utf8');
    results.push('site');
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'Nothing to import (expected site and/or media)' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, imported: results });
}
