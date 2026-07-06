import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createOrgRequest, getMyOrgRequests } from '@/lib/org-requests';
import { listAllSites } from '@/lib/admin';
import { getLocale } from '@/lib/i18n';
import { apiErrors, type ApiErrorsDict } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// A logged-in platform user requests to create/join an organization. The request
// is reviewed by a superadmin (see /api/admin/org-requests).

const ERR: Record<string, [number, keyof ApiErrorsDict]> = {
  PENDING_EXISTS: [409, 'pendingExists'],
  NAME_REQUIRED: [400, 'orgNameRequired'],
  SLUG_INVALID: [400, 'invalidSlug'],
  SLUG_TAKEN: [409, 'orgSlugTaken2'],
  ORG_NOT_FOUND: [404, 'orgNotFound'],
};

export async function GET() {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  return NextResponse.json({
    requests: getMyOrgRequests(me.id),
    organizations: listAllSites().map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  });
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });

  let body: { type?: string; requestedName?: string; requestedSlug?: string; targetSiteId?: string; message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const type = body.type === 'join' ? 'join' : 'create';
  try {
    const req = createOrgRequest(me, { type, requestedName: body.requestedName, requestedSlug: body.requestedSlug, targetSiteId: body.targetSiteId, message: body.message });
    return NextResponse.json({ ok: true, request: req });
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    const fallback: [number, keyof ApiErrorsDict] = [500, 'submitRequestFailed'];
    const [status, key] = ERR[code] ?? fallback;
    return NextResponse.json({ error: t[key] }, { status });
  }
}
