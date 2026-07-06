import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listAllSiteUsers, assignSiteUserOrg, setSiteUserStatus, listAllSites } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Superadmin: global view of tenant users (site_users) + assign them to an org.

export async function GET() {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });
  return NextResponse.json({
    users: listAllSiteUsers(),
    organizations: listAllSites().map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  });
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { action?: string; userId?: string; targetSiteId?: string; status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const userId = (body.userId ?? '').trim();
  if (!userId) return NextResponse.json({ error: t.userNotSpecified }, { status: 400 });

  try {
    if (body.action === 'assign-org') {
      assignSiteUserOrg(userId, (body.targetSiteId ?? '').trim());
      recordAudit({ id: me.id, email: me.email }, 'tenant_user.assign_org', userId, `организация ${body.targetSiteId}`);
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'set-status') {
      const status = body.status as 'pending' | 'approved' | 'rejected' | 'suspended';
      if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) return NextResponse.json({ error: t.invalidStatusDot }, { status: 400 });
      setSiteUserStatus(userId, status);
      recordAudit({ id: me.id, email: me.email }, 'tenant_user.set_status', userId, status);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: t.unknownAction }, { status: 400 });
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'EMAIL_TAKEN') return NextResponse.json({ error: t.orgEmailTaken }, { status: 409 });
    if (code === 'ORG_NOT_FOUND') return NextResponse.json({ error: t.orgNotFound }, { status: 404 });
    if (code === 'USER_NOT_FOUND') return NextResponse.json({ error: t.userNotFound }, { status: 404 });
    return NextResponse.json({ error: t.operationError }, { status: 500 });
  }
}
