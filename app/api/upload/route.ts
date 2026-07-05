import { NextResponse } from 'next/server';
import { optimizeUpload, ACCEPTED_TYPES } from '@/lib/media-optimize';

export const runtime = 'nodejs';
// Large enough for short videos; images are far smaller.
export const maxDuration = 120;

// Accepts an image or video (multipart field "file"), optimizes it via ffmpeg
// (images → .webp, videos → .webm + poster) and returns the public URL(s).
const MAX = 64 * 1024 * 1024; // 64 MB source cap

export async function POST(request: Request) {
  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'Файл не получен' }, { status: 400 });
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Неподдерживаемый формат (картинки или видео)' }, { status: 400 });
  }
  if (file.size > MAX) return NextResponse.json({ error: 'Файл больше 64 МБ' }, { status: 400 });

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
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Оптимизация не удалась' }, { status: 500 });
  }
}
