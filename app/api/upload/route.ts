import { NextResponse } from 'next/server';
import { optimizeUpload, ACCEPTED_TYPES } from '@/lib/media-optimize';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';
// Large enough for short videos; images are far smaller.
export const maxDuration = 120;

// Accepts an image or video (multipart field "file"), optimizes it via ffmpeg
// (images → .webp, videos → .webm + poster) and returns the public URL(s).
const MAX = 64 * 1024 * 1024; // 64 MB source cap

export async function POST(request: Request) {
  // Uploads burn ffmpeg CPU and disk — signed-in platform users only.
  if (!(await requireUser())) return unauthorized();
  const t = apiErrors(await getLocale());

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: t.fileNotReceived }, { status: 400 });
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: t.unsupportedFormat }, { status: 400 });
  }
  if (file.size > MAX) return NextResponse.json({ error: t.fileTooLarge }, { status: 400 });

  try {
    const result = await optimizeUpload(file);
    const saved = result.originalBytes > 0
      ? Math.max(0, Math.round((1 - result.optimizedBytes / result.originalBytes) * 100))
      : 0;
    return NextResponse.json({
      ok: true,
      url: result.url,
      poster: result.poster,
      kind: result.kind,
      originalBytes: result.originalBytes,
      optimizedBytes: result.optimizedBytes,
      savedPercent: saved,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : t.optimizationFailed }, { status: 500 });
  }
}
