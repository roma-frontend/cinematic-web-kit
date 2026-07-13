import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSiteVersion, getSiteForUser, getSiteVersion, listSiteVersions, parseDoc, saveDraft } from '@/lib/sites';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

async function resolveSite(request: Request) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: t.loginRequired }, { status: 401 }) };
  const siteId = new URL(request.url).searchParams.get('site');
  if (!siteId) return { error: NextResponse.json({ error: t.siteNotSpecified }, { status: 400 }) };
  const site = getSiteForUser(user.id, siteId);
  if (!site) return { error: NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 }) };
  return { site, user };
}

export async function GET(request: Request) {
  const { site, error } = await resolveSite(request);
  if (error) return error;
  const versionId = new URL(request.url).searchParams.get('version');
  if (!versionId) return NextResponse.json({ versions: listSiteVersions(site.id) });
  const version = getSiteVersion(site.id, versionId);
  if (!version) return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
  return NextResponse.json({ version });
}

export async function POST(request: Request) {
  const { site, user, error } = await resolveSite(request);
  if (error) return error;
  const body = await request.json().catch(() => null) as { versionId?: string } | null;
  if (!body?.versionId) return NextResponse.json({ error: 'Version id is required.' }, { status: 400 });
  const version = getSiteVersion(site.id, body.versionId);
  const doc = version && parseDoc(version.doc);
  if (!version || !doc) return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
  const current = parseDoc(site.draftDoc);
  if (current) createSiteVersion(site.id, user.id, current, 'Before restore');
  saveDraft(site, doc);
  return NextResponse.json({ ok: true, doc });
}
