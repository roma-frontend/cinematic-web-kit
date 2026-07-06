import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { createSite, listSitesForUser } from '@/lib/sites';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

const MAX_SITES_PER_USER = 20;

export async function GET() {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const sites = listSitesForUser(user.id).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    published: Boolean(s.publishedDoc),
    publishedAt: s.publishedAt,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }));
  return NextResponse.json({ sites });
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: t.enterSiteName }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: t.nameTooLong }, { status: 400 });

  const owned = listSitesForUser(user.id).length;
  // Access gate: a user without an organization can't create sites directly —
  // a superadmin must approve their create/join request first. Approval itself
  // provisions the first site server-side (bypassing this endpoint).
  if (owned === 0 && !isSuperadmin(user)) {
    return NextResponse.json({ error: t.orgNeedsApproval }, { status: 403 });
  }
  if (owned >= MAX_SITES_PER_USER) {
    return NextResponse.json({ error: t.maxSites.replace('{max}', String(MAX_SITES_PER_USER)) }, { status: 400 });
  }

  const site = createSite(user.id, name);
  return NextResponse.json({ ok: true, site: { id: site.id, name: site.name, slug: site.slug } });
}
