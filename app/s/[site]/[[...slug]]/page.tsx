// Public tenant route: /s/<slug>/<page-path>. Also the target of the
// middleware rewrite for <slug>.APP_HOST subdomains. Visitors see the
// published snapshot; the owner can open ?draft=1 to preview unpublished work
// (the studio preview iframe uses ?draft=1&edit=1).

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { getSiteBySlug, parseDoc, rebaseDoc, APP_HOST } from '@/lib/sites';
import { LANDING_SLUG } from '@/lib/landing-site';
import { subdomainUrl, tenantJsonLd } from '@/lib/seo';
import { SiteRenderer, SiteAuthPage, AUTH_PATHS, findPageByPath } from '@/components/builder/site-renderer';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ site: string; slug?: string[] }>;
  searchParams: Promise<{ edit?: string; draft?: string }>;
};

// Links rebase to '' (site root) when the site is opened on its own subdomain
// (<slug>.APP_HOST) or a custom domain — there the site lives at '/'. Only the
// path-based /s/<slug> access on the main host uses the '/s/<slug>' base.
async function linkBase(slug: string): Promise<string> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || '').toLowerCase().split(':')[0];
  const appHostname = APP_HOST.split(':')[0];
  if (host && host !== appHostname && host !== `www.${appHostname}`) return ''; // subdomain / custom domain → root
  return `/s/${slug}`;
}

async function resolve(siteSlug: string, wantDraft: boolean) {
  const site = getSiteBySlug(decodeURIComponent(siteSlug));
  if (!site) return null;
  let doc = parseDoc(site.publishedDoc);
  if (wantDraft) {
    const user = await getCurrentUser();
    if (user && user.id === site.userId) doc = parseDoc(site.draftDoc) ?? doc;
  }
  if (!doc) return null;
  const base = await linkBase(site.slug);
  return { site, doc: { ...rebaseDoc(doc, base), siteId: site.id } };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { site: siteSlug, slug } = await params;
  const { draft } = await searchParams;
  const isDraft = draft === '1';
  const resolved = await resolve(siteSlug, isDraft);
  if (!resolved) return { title: 'Сайт не найден', robots: { index: false, follow: false } };
  const page = findPageByPath(resolved.doc, slug ?? []);
  const title = page ? `${page.title} — ${resolved.doc.brand}` : resolved.doc.brand;
  const description = page?.description || undefined;
  const canonical = subdomainUrl(resolved.site.slug, (slug ?? []).join('/'));
  return {
    title,
    description,
    // Canonicalize to the site's own subdomain so the /s/<slug> mirror on the
    // main host doesn't create duplicate content.
    alternates: { canonical },
    // Drafts (owner preview) must never be indexed.
    robots: isDraft ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: 'website', title, description, url: canonical, siteName: resolved.doc.brand },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TenantSitePage({ params, searchParams }: Props) {
  const { site: siteSlug, slug } = await params;
  const { edit, draft } = await searchParams;
  const resolved = await resolve(siteSlug, draft === '1');
  if (!resolved) notFound();
  const parts = slug ?? [];
  // Reserved built-in auth pages — not editable in the builder.
  if (parts.length === 1 && AUTH_PATHS.has(parts[0])) {
    return <SiteAuthPage doc={resolved.doc} mode={parts[0] as 'login' | 'register' | 'account'} />;
  }
  const page = findPageByPath(resolved.doc, parts);
  if (!page) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            tenantJsonLd(resolved.doc.brand, subdomainUrl(resolved.site.slug, parts.join('/')), page.description),
          ),
        }}
      />
      <SiteRenderer doc={resolved.doc} page={page} edit={edit === '1' && draft === '1'} platformChrome={resolved.site.slug === LANDING_SLUG} />
    </>
  );
}
