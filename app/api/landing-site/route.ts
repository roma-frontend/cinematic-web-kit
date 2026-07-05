import { NextResponse } from 'next/server';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { getOrCreateLandingSite } from '@/lib/landing-site';

export const runtime = 'nodejs';

// Returns the landing builder site, creating + publishing a seeded one on first
// call. Staff-only: the landing (/) is a shared platform page. The returned id
// is used to open it in the visual builder (/studio/builder?site=<id>).
export async function POST() {
  const user = await getCurrentUser();
  if (!isStaff(user)) {
    return NextResponse.json({ error: 'Требуются права администратора' }, { status: 403 });
  }
  const site = getOrCreateLandingSite();
  if (!site) return NextResponse.json({ error: 'Нет пользователя-владельца' }, { status: 500 });
  return NextResponse.json({ id: site.id, slug: site.slug });
}
