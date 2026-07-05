// Custom-domain route — never visited directly: middleware rewrites any
// request whose Host is not APP_HOST (nor a subdomain of it) to
// /d/<hostname>/<path>. Renders the published snapshot only.

import { notFound } from 'next/navigation';
import { getSiteByHostname, parseDoc, rebaseDoc } from '@/lib/sites';
import { SiteRenderer, findPageByPath } from '@/components/builder/site-renderer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ domain: string; slug?: string[] }> };

function resolve(domainParam: string) {
  const hostname = decodeURIComponent(domainParam).toLowerCase();
  const site = getSiteByHostname(hostname);
  if (!site) return null;
  const doc = parseDoc(site.publishedDoc);
  if (!doc) return null;
  // Custom domain serves the site at its root, so links rebase to ''.
  return { site, doc: rebaseDoc(doc, '') };
}

export async function generateMetadata({ params }: Props) {
  const { domain, slug } = await params;
  const resolved = resolve(domain);
  if (!resolved) return { title: 'Сайт не найден' };
  const page = findPageByPath(resolved.doc, slug ?? []);
  return {
    title: page ? `${page.title} — ${resolved.doc.brand}` : resolved.doc.brand,
    description: page?.description || undefined,
  };
}

export default async function CustomDomainPage({ params }: Props) {
  const { domain, slug } = await params;
  const resolved = resolve(domain);
  if (!resolved) notFound();
  const page = findPageByPath(resolved.doc, slug ?? []);
  if (!page) notFound();
  return <SiteRenderer doc={resolved.doc} page={page} />;
}
