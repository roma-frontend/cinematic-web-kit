import { NextResponse } from 'next/server';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { getOrCreateLandingSite } from '@/lib/landing-site';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Returns the landing builder site, creating a seeded DRAFT one on first call
// (not published — / keeps showing the marketing page until the editor hits
// "Опубликовать"). Staff-only. The id is used to open it in the visual builder.
export async function POST() {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!isStaff(user)) {
    return NextResponse.json({ error: t.adminRightsRequired }, { status: 403 });
  }
  const site = getOrCreateLandingSite();
  if (!site) return NextResponse.json({ error: t.noOwnerUser }, { status: 500 });
  return NextResponse.json({ id: site.id, slug: site.slug });
}
