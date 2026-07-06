import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { getOrgOverview, assignSiteAdmin } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Superadmin organization management: view a selected org (site) overview and
// assign its admin (transfer ownership to a platform user + promote to admin).

export async function GET(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const siteId = new URL(request.url).searchParams.get('site') ?? '';
  if (!siteId) return NextResponse.json({ overview: null });
  return NextResponse.json({ overview: getOrgOverview(siteId) });
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { action?: string; siteId?: string; email?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const siteId = (body.siteId ?? '').trim();
  if (body.action === 'assign-admin') {
    const email = (body.email ?? '').trim();
    if (!email) return NextResponse.json({ error: t.enterUserEmail }, { status: 400 });
    try {
      const owner = assignSiteAdmin(siteId, email);
      recordAudit({ id: me.id, email: me.email }, 'org.assign_admin', owner.email, `сайт ${siteId}`);
      return NextResponse.json({ ok: true, owner, overview: getOrgOverview(siteId) });
    } catch (e) {
      if (e instanceof Error && e.message === 'USER_NOT_FOUND') return NextResponse.json({ error: t.userEmailNotFound }, { status: 404 });
      if (e instanceof Error && e.message === 'SITE_NOT_FOUND') return NextResponse.json({ error: t.orgNotFound }, { status: 404 });
      return NextResponse.json({ error: t.assignAdminFailed }, { status: 500 });
    }
  }
  return NextResponse.json({ error: t.unknownAction }, { status: 400 });
}
