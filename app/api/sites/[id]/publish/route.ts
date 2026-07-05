import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSiteForUser, publishSite, unpublishSite, parseDoc } from '@/lib/sites';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: 'Сайт не найден.' }, { status: 404 });

  const doc = parseDoc(site.draftDoc);
  if (!doc || !doc.pages.length) {
    return NextResponse.json({ error: 'Нечего публиковать: добавьте хотя бы одну страницу в конструкторе.' }, { status: 400 });
  }
  publishSite(site);
  return NextResponse.json({ ok: true, publishedAt: new Date().toISOString() });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Требуется вход.' }, { status: 401 });
  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) return NextResponse.json({ error: 'Сайт не найден.' }, { status: 404 });
  unpublishSite(site);
  return NextResponse.json({ ok: true });
}
