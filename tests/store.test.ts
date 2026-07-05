import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadDoc, saveDoc, findPage } from '@/lib/builder/store';
import type { BuilderDoc } from '@/lib/builder/types';

const FILE = path.join(process.cwd(), 'data', 'builder.json');
let original: string;

beforeAll(async () => {
  original = await readFile(FILE, 'utf8');
});

afterEach(async () => {
  // restore the real file after any test that mutates it
  await writeFile(FILE, original, 'utf8');
});

afterAll(async () => {
  await writeFile(FILE, original, 'utf8');
});

const sampleDoc = (): BuilderDoc => ({
  brand: 'Test',
  themeId: 'auto',
  nav: [],
  footer: { text: 'f', links: [] },
  pages: [
    { id: 'p1', path: '', title: 'Home', blocks: [] },
    { id: 'p2', path: 'about', title: 'About', blocks: [] },
  ],
});

describe('loadDoc()', () => {
  it('loads and parses the real builder.json', async () => {
    const doc = await loadDoc();
    expect(Array.isArray(doc.pages)).toBe(true);
  });

  it('falls back to the seed when the file is invalid JSON', async () => {
    await writeFile(FILE, 'not-json{{{', 'utf8');
    const doc = await loadDoc();
    expect(Array.isArray(doc.pages)).toBe(true); // seed shape
  });

  it('falls back to the seed when pages is not an array', async () => {
    await writeFile(FILE, JSON.stringify({ pages: 'nope' }), 'utf8');
    const doc = await loadDoc();
    expect(Array.isArray(doc.pages)).toBe(true);
  });
});

describe('saveDoc()', () => {
  it('writes a doc that loadDoc can read back', async () => {
    await saveDoc(sampleDoc());
    const doc = await loadDoc();
    expect(doc.brand).toBe('Test');
    expect(doc.pages.map((p) => p.path)).toEqual(['', 'about']);
    const raw = await readFile(FILE, 'utf8');
    expect(raw.endsWith('\n')).toBe(true); // trailing newline
  });
});

describe('findPage()', () => {
  it('finds a page by slug segments', () => {
    const doc = sampleDoc();
    const r = findPage(doc, ['about']);
    expect(r.target).toBe('about');
    expect(r.page?.id).toBe('p2');
  });

  it('resolves the home page for an empty slug', () => {
    const r = findPage(sampleDoc(), []);
    expect(r.target).toBe('');
    expect(r.page?.id).toBe('p1');
  });

  it('handles nested slugs and missing pages', () => {
    const doc = sampleDoc();
    doc.pages.push({ id: 'p3', path: 'blog/post', title: 'Post', blocks: [] });
    expect(findPage(doc, ['blog', 'post']).page?.id).toBe('p3');
    expect(findPage(doc, ['nope']).page).toBeNull();
  });

  it('treats a null slug as home', () => {
    // @ts-expect-error exercising the (slug ?? []) guard
    const r = findPage(sampleDoc(), null);
    expect(r.target).toBe('');
    expect(r.page?.id).toBe('p1');
  });
});
