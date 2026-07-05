import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSite, listSitesForUser } from '@/lib/sites';

export const runtime = 'nodejs';

const MAX_SITES_PER_USER = 20;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });
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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Укажите название сайта.' }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: 'Название слишком длинное.' }, { status: 400 });

  if (listSitesForUser(user.id).length >= MAX_SITES_PER_USER) {
    return NextResponse.json({ error: `Достигнут лимит ${MAX_SITES_PER_USER} сайтов.` }, { status: 400 });
  }

  const site = createSite(user.id, name);
  return NextResponse.json({ ok: true, site: { id: site.id, name: site.name, slug: site.slug } });
}
