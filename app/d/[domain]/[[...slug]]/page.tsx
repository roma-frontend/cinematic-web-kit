// Custom-domain route — never visited directly: middleware rewrites any
// request whose Host is not APP_HOST (nor a subdomain of it) to
// /d/<hostname>/<path>. Renders the published snapshot only.

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSiteByHostname, parseDoc, rebaseDoc } from '@/lib/sites';
import { tenantJsonLd } from '@/lib/seo';
import { SiteRenderer, SiteAuthPage, AUTH_PATHS, findPageByPath } from '@/components/builder/site-renderer';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ domain: string; slug?: string[] }> };

function resolve(domainParam: string) {
  const hostname = decodeURIComponent(domainParam).toLowerCase();
  const site = getSiteByHostname(hostname);
  if (!site) return null;
  const doc = parseDoc(site.publishedDoc);
  if (!doc) return null;
  // Custom domain serves the site at its root, so links rebase to ''.
  return { site, doc: { ...rebaseDoc(doc, ''), siteId: site.id } };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain, slug } = await params;
  const resolved = resolve(domain);
  if (!resolved) return { title: 'Сайт не найден', robots: { index: false, follow: false } };
  const page = findPageByPath(resolved.doc, slug ?? []);
  const title = page ? `${page.title} — ${resolved.doc.brand}` : resolved.doc.brand;
  const description = page?.description || undefined;
  const hostname = decodeURIComponent(domain).toLowerCase();
  const path = (slug ?? []).join('/');
  const canonical = `https://${hostname}${path ? `/${path}` : ''}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { type: 'website', title, description, url: canonical, siteName: resolved.doc.brand },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function CustomDomainPage({ params }: Props) {
  const { domain, slug } = await params;
  const resolved = resolve(domain);
  if (!resolved) notFound();
  const parts = slug ?? [];
  if (parts.length === 1 && AUTH_PATHS.has(parts[0])) {
    return <SiteAuthPage doc={resolved.doc} mode={parts[0] as 'login' | 'register' | 'account'} />;
  }
  const page = findPageByPath(resolved.doc, parts);
  if (!page) notFound();
  const hostname = decodeURIComponent(domain).toLowerCase();
  const canonical = `https://${hostname}${parts.length ? `/${parts.join('/')}` : ''}`;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(tenantJsonLd(resolved.doc.brand, canonical, page.description)),
        }}
      />
      <SiteRenderer doc={resolved.doc} page={page} />
    </>
  );
}
