import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireSiteOwner } from '@/lib/site-membership';
import { storeDocument } from '@/lib/site-documents';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Admin (site owner) file upload for member documents. Multipart form-data:
// fields `siteId`, `title` (optional), and `file`. Stored via lib/site-documents
// (R2 when configured, else public/uploads). Ownership-checked + siteId-scoped.
export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.unauthorized }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }
  const siteId = String(form.get('siteId') ?? '');
  const title = String(form.get('title') ?? '');
  const file = form.get('file');

  try {
    requireSiteOwner(user, siteId);
  } catch {
    return NextResponse.json({ error: t.accessDenied }, { status: 403 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: t.badRequest }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await storeDocument(siteId, user.id, { fileName: file.name, buffer, contentType: file.type, title });
  if (res.error === 'TOO_LARGE') return NextResponse.json({ error: t.fileTooLarge }, { status: 413 });
  if (res.error || !res.document) return NextResponse.json({ error: t.badRequest }, { status: 400 });
  return NextResponse.json({ ok: true, document: res.document });
}
