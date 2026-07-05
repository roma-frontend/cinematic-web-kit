// Public tenant route: /s/<slug>/<page-path>. Also the target of the
// middleware rewrite for <slug>.APP_HOST subdomains. Visitors see the
// published snapshot; the owner can open ?draft=1 to preview unpublished work
// (the studio preview iframe uses ?draft=1&edit=1).

import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSiteBySlug, parseDoc, rebaseDoc } from '@/lib/sites';
import { SiteRenderer, findPageByPath } from '@/components/builder/site-renderer';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ site: string; slug?: string[] }>;
  searchParams: Promise<{ edit?: string; draft?: string }>;
};

async function resolve(siteSlug: string, wantDraft: boolean) {
  const site = getSiteBySlug(decodeURIComponent(siteSlug));
  if (!site) return null;
  let doc = parseDoc(site.publishedDoc);
  if (wantDraft) {
    const user = await getCurrentUser();
    if (user && user.id === site.userId) doc = parseDoc(site.draftDoc) ?? doc;
  }
  if (!doc) return null;
  return { site, doc: rebaseDoc(doc, `/s/${site.slug}`) };
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { site: siteSlug, slug } = await params;
  const { draft } = await searchParams;
  const resolved = await resolve(siteSlug, draft === '1');
  if (!resolved) return { title: 'Сайт не найден' };
  const page = findPageByPath(resolved.doc, slug ?? []);
  return {
    title: page ? `${page.title} — ${resolved.doc.brand}` : resolved.doc.brand,
    description: page?.description || undefined,
  };
}

export default async function TenantSitePage({ params, searchParams }: Props) {
  const { site: siteSlug, slug } = await params;
  const { edit, draft } = await searchParams;
  const resolved = await resolve(siteSlug, draft === '1');
  if (!resolved) notFound();
  const page = findPageByPath(resolved.doc, slug ?? []);
  if (!page) notFound();
  return <SiteRenderer doc={resolved.doc} page={page} edit={edit === '1' && draft === '1'} />;
}
