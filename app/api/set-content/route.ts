import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

// Updates editable text fields (title/subtitle/ctaLabel/ctaHref) of existing
// media entries in data/media.json, matched by id. Media files are untouched.
// LOCAL/dev use only.
const FIELDS = ['title', 'subtitle', 'ctaLabel', 'ctaHref'] as const;

interface Edit {
  id: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export async function POST(request: Request) {
  let edits: Edit[] = [];
  try {
    const body = await request.json();
    edits = Array.isArray(body?.entries) ? body.entries : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const file = path.join(process.cwd(), 'data', 'media.json');
  let list: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    return NextResponse.json({ error: 'media.json not readable' }, { status: 500 });
  }

  const byId = new Map(edits.map((e) => [e.id, e]));
  let changed = 0;
  for (const item of list) {
    const edit = byId.get(String(item.id));
    if (!edit) continue;
    for (const f of FIELDS) {
      if (typeof edit[f] === 'string') {
        const v = (edit[f] as string).trim();
        if (v) item[f] = v;
        else delete item[f];
      }
    }
    changed += 1;
  }

  try {
    await writeFile(file, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'write failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, changed });
}
