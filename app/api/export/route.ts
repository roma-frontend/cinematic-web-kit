import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

// Returns the full site configuration (site.json + media.json) as one bundle,
// so a page can be exported and re-imported / version-controlled.
async function readJson(file: string, fallback: unknown) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function GET() {
  const dir = path.join(process.cwd(), 'data');
  const site = await readJson(path.join(dir, 'site.json'), { theme: 'auto', layout: null });
  const media = await readJson(path.join(dir, 'media.json'), []);
  return NextResponse.json(
    { version: 1, exportedAt: new Date().toISOString(), site, media },
    { headers: { 'Content-Disposition': 'attachment; filename="site-config.json"' } },
  );
}
