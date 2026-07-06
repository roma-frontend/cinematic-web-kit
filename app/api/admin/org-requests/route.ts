import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listOrgRequests, approveOrgRequest, rejectOrgRequest } from '@/lib/org-requests';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Superadmin review of organization requests (create/join): list + approve/reject.

export async function GET(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });
  const status = new URL(request.url).searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
  return NextResponse.json({ requests: listOrgRequests(status ?? undefined) });
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { action?: string; requestId?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const requestId = (body.requestId ?? '').trim();

  try {
    if (body.action === 'approve') {
      const { siteId } = approveOrgRequest(me.id, requestId);
      recordAudit({ id: me.id, email: me.email }, 'org_request.approve', requestId, `сайт ${siteId}`);
      return NextResponse.json({ ok: true, siteId });
    }
    if (body.action === 'reject') {
      rejectOrgRequest(me.id, requestId, body.reason ?? '');
      recordAudit({ id: me.id, email: me.email }, 'org_request.reject', requestId, body.reason ?? '');
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: t.unknownAction }, { status: 400 });
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'SLUG_TAKEN') return NextResponse.json({ error: t.orgSlugTaken }, { status: 409 });
    if (code === 'ALREADY_REVIEWED') return NextResponse.json({ error: t.requestAlreadyReviewed }, { status: 409 });
    if (code === 'REQUEST_NOT_FOUND') return NextResponse.json({ error: t.requestNotFound }, { status: 404 });
    return NextResponse.json({ error: t.requestProcessFailed }, { status: 500 });
  }
}
