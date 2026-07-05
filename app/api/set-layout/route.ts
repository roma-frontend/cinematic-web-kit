import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

// Persists the page composition (ordered block list) into data/site.json,
// merging so `theme` is preserved. `layout: null` resets to the theme default.
// LOCAL/dev use only.
const VALID_BLOCKS = new Set(['hero', 'split', 'cards', 'mosaic', 'sticky', 'background', 'beams', 'marquee']);

export async function POST(request: Request) {
  let layout: string[] | null = null;
  try {
    const body = await request.json();
    const raw = body?.layout;
    if (raw === null) layout = null;
    else if (Array.isArray(raw)) layout = raw.map(String).filter((b) => VALID_BLOCKS.has(b));
    else return NextResponse.json({ error: 'layout must be an array or null' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const file = path.join(process.cwd(), 'data', 'site.json');
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* start fresh */
  }
  try {
    await writeFile(file, `${JSON.stringify({ ...current, layout }, null, 2)}\n`, 'utf8');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'write failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, layout });
}
