import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, sites } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSiteForUser, listDomains, slugify, getSiteBySlug, RESERVED_SLUGS } from '@/lib/sites';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: 'Сайт не найден.' }, { status: 404 });
  return NextResponse.json({
    site: {
      id: site.id,
      name: site.name,
      slug: site.slug,
      published: Boolean(site.publishedDoc),
      publishedAt: site.publishedAt,
      updatedAt: site.updatedAt,
      domains: listDomains(site.id),
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: 'Сайт не найден.' }, { status: 404 });

  let body: { name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Partial<{ name: string; slug: string; updatedAt: Date }> = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name || name.length > 80) return NextResponse.json({ error: 'Некорректное название.' }, { status: 400 });
    updates.name = name;
  }
  if (typeof body.slug === 'string') {
    const slug = slugify(body.slug);
    if (!slug || slug.length < 2) return NextResponse.json({ error: 'Некорректный адрес (slug).' }, { status: 400 });
    if (RESERVED_SLUGS.has(slug)) return NextResponse.json({ error: 'Этот адрес зарезервирован.' }, { status: 400 });
    const existing = getSiteBySlug(slug);
    if (existing && existing.id !== site.id) {
      return NextResponse.json({ error: 'Этот адрес уже занят.' }, { status: 409 });
    }
    updates.slug = slug;
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Нечего обновлять.' }, { status: 400 });

  updates.updatedAt = new Date();
  getDb().update(sites).set(updates).where(eq(sites.id, site.id)).run();
  return NextResponse.json({ ok: true, site: { id: site.id, name: updates.name ?? site.name, slug: updates.slug ?? site.slug } });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: 'Сайт не найден.' }, { status: 404 });
  getDb().delete(sites).where(eq(sites.id, site.id)).run();
  return NextResponse.json({ ok: true });
}
