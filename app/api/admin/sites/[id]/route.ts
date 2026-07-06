import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { deleteSiteById, unpublishSiteById } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';
import { getDb, sites } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

function siteExists(id: string): boolean {
  return Boolean(getDb().select({ id: sites.id }).from(sites).where(eq(sites.id, id)).get());
}

// Superadmin site control: DELETE removes any site; PATCH { action:'unpublish' }.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const { id } = await params;
  if (!siteExists(id)) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });
  deleteSiteById(id);
  recordAudit({ id: me.id, email: me.email }, 'site.delete', id);
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const { id } = await params;
  if (!siteExists(id)) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  let body: { action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (body.action === 'unpublish') {
    unpublishSiteById(id);
    recordAudit({ id: me.id, email: me.email }, 'site.unpublish', id);
    return NextResponse.json({ ok: true, id, published: false });
  }
  return NextResponse.json({ error: t.unknownActionDot }, { status: 400 });
}
