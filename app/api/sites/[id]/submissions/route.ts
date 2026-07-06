import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSiteForUser, listSubmissions } from '@/lib/sites';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  const rows = listSubmissions(site.id).map((s) => ({
    id: s.id,
    formId: s.formId,
    data: JSON.parse(s.data) as Record<string, unknown>,
    createdAt: s.createdAt,
  }));
  return NextResponse.json({ submissions: rows });
}
