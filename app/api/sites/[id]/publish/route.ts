import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSiteForUser, publishSite, unpublishSite, parseDoc } from '@/lib/sites';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  const doc = parseDoc(site.draftDoc);
  if (!doc || !doc.pages.length) {
    return NextResponse.json({ error: t.nothingToPublish }, { status: 400 });
  }
  publishSite(site);
  return NextResponse.json({ ok: true, publishedAt: new Date().toISOString() });
}

export async function DELETE(_req: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });
  unpublishSite(site);
  return NextResponse.json({ ok: true });
}
