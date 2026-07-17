import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { isSuperadmin } from '@/lib/auth';
import { enforceFeature } from '@/lib/billing/enforce';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { STYLE_PRESETS, type StyleId } from '@/lib/prompt-composer';
import { r2Configured, r2Put, r2Delete, R2_PUBLIC_BASE, contentTypeFor } from '@/lib/storage';

export const runtime = 'nodejs';
// Image generation can take up to ~30s per variant on the free tier.
export const maxDuration = 120;

// Free text-to-image via pollinations.ai — no API key required. The generated
// JPEG is re-encoded to .webp with the bundled ffmpeg (same as uploads) and
// registered in data/images.json so the Studio gallery survives reloads.

const execFileAsync = promisify(execFile);

const IMAGES_DIR = path.join(process.cwd(), 'public', 'media', 'generated', 'images');
const DATA_FILE = path.join(process.cwd(), 'data', 'images.json');

const ASPECTS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720, h: 1280 },
  '1:1': { w: 1024, h: 1024 },
  '4:3': { w: 1152, h: 864 },
  '3:2': { w: 1200, h: 800 },
};

export interface ImageEntry {
  id: string;
  title: string;
  prompt: string;
  style?: string;
  aspect: string;
  src: string;
  seed: number;
  createdAt: string;
  /** Platform user who generated it. Absent = legacy/platform-owned (superadmin). */
  ownerId?: string;
}

async function readEntries(): Promise<ImageEntry[]> {
  try {
    const data = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Tenant isolation: an org 'admin' only ever sees/deletes THEIR OWN generated
 * images (ownerId === user.id). The superadmin runs the platform and sees
 * everything (including legacy entries with no ownerId).
 */
function canSee(entry: ImageEntry, user: { id: string; role?: string }): boolean {
  return isSuperadmin(user) || entry.ownerId === user.id;
}

const writeEntries = (entries: ImageEntry[]) =>
  writeFile(DATA_FILE, JSON.stringify(entries, null, 2) + '\n', 'utf8');

async function resolveFfmpeg(): Promise<string> {
  try {
    const mod = await import('ffmpeg-static');
    const bin = (mod.default as unknown as string) || (mod as unknown as string);
    if (bin && existsSync(bin)) return bin;
  } catch { /* fall through */ }
  return 'ffmpeg';
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'image';

/** Compose a photographic prompt from the brief + a cinematic style preset. */
function composeImagePrompt(prompt: string, styleId: string, seed: number, dna?: { lens: string; lighting: string; colorGrade: string; filmStock: string; mood: string }): { text: string; style?: string } {
  const quality = 'ultra-detailed, high resolution, photorealistic, professional photography, sharp focus, no text, no watermark';
  if (dna) {
    return {
      text: `${prompt}, ${dna.lens}, ${dna.lighting}, ${dna.colorGrade}, ${dna.filmStock}, ${dna.mood}, ${quality}`,
      style: 'dna',
    };
  }
  const preset =
    styleId === 'auto'
      ? STYLE_PRESETS[seed % STYLE_PRESETS.length]
      : STYLE_PRESETS.find((p) => p.id === styleId);
  if (!preset) return { text: `${prompt}, ${quality}` };
  return {
    text: `${prompt}, ${preset.lens}, ${preset.lighting}, ${preset.colorGrade}, ${preset.filmStock}, ${preset.mood}, ${quality}`,
    style: preset.id,
  };
}

async function fetchImage(promptText: string, w: number, h: number, seed: number): Promise<Buffer> {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}` +
    `?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true`;
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(90_000) }).catch((e: Error) => e);
    if (res instanceof Error) {
      lastErr = res.message;
    } else if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    } else {
      lastErr = `HTTP ${res.status}`;
      // 429/5xx from the free tier — brief backoff, then one retry.
      if (res.status < 429) break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Image service failed: ${lastErr}`);
}

const R2_PREFIX = 'generated/images';

/**
 * Turn a produced local file into a public URL — same contract as uploads
 * (lib/media-optimize.ts): with Cloudflare R2 configured the file goes to the
 * bucket (key `generated/images/<name>`) and is served from R2_PUBLIC_BASE_URL;
 * otherwise it stays under public/media/generated/images.
 */
async function finalize(localAbsPath: string, name: string): Promise<string> {
  if (r2Configured()) {
    const buf = await readFile(localAbsPath);
    await r2Put(`${R2_PREFIX}/${name}`, buf, contentTypeFor(name));
    await unlink(localAbsPath).catch(() => {});
    return `${R2_PUBLIC_BASE}/${R2_PREFIX}/${name}`;
  }
  return `/media/generated/images/${name}`;
}

/** Re-encode to webp (same params as uploads); falls back to the original JPEG if ffmpeg is missing. */
async function saveOptimized(buf: Buffer, base: string): Promise<string> {
  await mkdir(IMAGES_DIR, { recursive: true });
  const tmp = path.join(tmpdir(), `${base}.jpg`);
  await writeFile(tmp, buf);
  try {
    const out = path.join(IMAGES_DIR, `${base}.webp`);
    await execFileAsync(await resolveFfmpeg(), [
      '-y', '-i', tmp,
      '-vf', "scale='min(1600,iw)':-2",
      '-c:v', 'libwebp', '-quality', '80',
      out,
    ], { maxBuffer: 1024 * 1024 * 64 });
    if ((await stat(out)).size > 0) return finalize(out, `${base}.webp`);
  } catch { /* fall back to jpeg */ } finally {
    await unlink(tmp).catch(() => {});
  }
  const out = path.join(IMAGES_DIR, `${base}.jpg`);
  await writeFile(out, buf);
  return finalize(out, `${base}.jpg`);
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const entries = await readEntries();
  return NextResponse.json({ entries: entries.filter((e) => canSee(e, user)) });
}

interface GenerateImageBody {
  prompt?: string;
  title?: string;
  aspect?: string;
  style?: StyleId;
  count?: number;
  dna?: { lens: string; lighting: string; colorGrade: string; filmStock: string; mood: string };
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const t = apiErrors(await getLocale());
  const gate = enforceFeature(user, 'ai.generate', t.forbidden);
  if (gate) return gate;
  if (!rateLimit(`generate-image:${user.id}`, 10)) {
    return NextResponse.json({ error: t.tooManyGenerations }, { status: 429 });
  }

  let body: GenerateImageBody;
  try {
    body = (await request.json()) as GenerateImageBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: 'Provide a "prompt".' }, { status: 400 });

  const aspect = ASPECTS[body.aspect ?? ''] ? (body.aspect as string) : '16:9';
  const { w, h } = ASPECTS[aspect];
  const count = Math.max(1, Math.min(4, Math.trunc(body.count ?? 1)));
  const title = body.title?.trim() || prompt.slice(0, 60);
  const slug = slugify(body.title?.trim() || prompt);

  const created: ImageEntry[] = [];
  let error: string | null = null;
  // Sequential on purpose — the free tier throttles parallel requests.
  for (let i = 0; i < count; i++) {
    const seed = Math.floor(Math.random() * 1_000_000);
    const composed = composeImagePrompt(prompt, body.style ?? 'auto', seed, body.dna);
    try {
      const buf = await fetchImage(composed.text, w, h, seed);
      const base = `${slug}-${Date.now().toString(36)}-${seed.toString(36)}`;
      const src = await saveOptimized(buf, base);
      created.push({
        id: base,
        title,
        prompt,
        style: composed.style,
        aspect,
        src,
        seed,
        createdAt: new Date().toISOString(),
        ownerId: user.id,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Generation failed';
      break;
    }
  }

  if (created.length) {
    const entries = await readEntries();
    await writeEntries([...created, ...entries]);
  }
  if (!created.length) {
    return NextResponse.json({ error: error ?? 'Generation failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, entries: created, partialError: error });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  let id = '';
  try {
    id = String(((await request.json()) as { id?: string }).id ?? '');
  } catch { /* handled below */ }
  if (!id) return NextResponse.json({ error: 'Provide an "id".' }, { status: 400 });

  const entries = await readEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Isolation: you can only delete an image you own (superadmin may delete any).
  if (!canSee(entry, user)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // entry.src is either a local /media/generated/images/<file> path or an R2
  // public URL (<R2_PUBLIC_BASE>/generated/images/<file>) written by this route.
  if (/^https?:\/\//.test(entry.src)) {
    const key = R2_PUBLIC_BASE && entry.src.startsWith(`${R2_PUBLIC_BASE}/`)
      ? entry.src.slice(R2_PUBLIC_BASE.length + 1)
      : new URL(entry.src).pathname.replace(/^\//, '');
    if (key.startsWith(`${R2_PREFIX}/`)) await r2Delete(key);
  } else {
    await unlink(path.join(IMAGES_DIR, path.basename(entry.src))).catch(() => {});
  }
  await writeEntries(entries.filter((e) => e.id !== id));
  return NextResponse.json({ ok: true });
}
