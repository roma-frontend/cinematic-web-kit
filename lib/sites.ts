// Tenant service layer: every site is a row in `sites` owning a full
// BuilderDoc. Public rendering resolves a site by slug (/s/<slug> or
// <slug>.APP_HOST) or by attached custom domain.

import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb, newId, sites, domains, submissions, type Site, type Domain } from '@/lib/db';
import { DEFAULT_DOC, type BuilderDoc, type BuilderNode } from '@/lib/builder/types';
import { starterPage } from '@/lib/builder/templates';

export const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'studio', 'site', 'sites', 's', 'd',
  'login', 'register', 'logout', 'assets', 'static', 'uploads', 'mail', 'ftp',
]);

/** "Моя Кофейня #1" → "moya-kofeynya-1" (translit + kebab). */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
    ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return input
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function uniqueSlug(base: string): string {
  const db = getDb();
  let candidate = base || 'site';
  if (RESERVED_SLUGS.has(candidate)) candidate = `${candidate}-1`;
  for (let i = 2; ; i++) {
    const exists = db.select({ id: sites.id }).from(sites).where(eq(sites.slug, candidate)).get();
    if (!exists) return candidate;
    candidate = `${base || 'site'}-${i}`;
  }
}

export function createSite(userId: string, name: string): Site {
  const db = getDb();
  const trimmed = name.trim() || 'Мой сайт';
  const now = new Date();
  // Seed with a publishable starter page; DEFAULT_DOC's demo nav points at
  // pages a fresh site doesn't have, so it collapses to the home link only.
  const doc: BuilderDoc = {
    ...structuredClone(DEFAULT_DOC),
    brand: trimmed,
    nav: [],
    footer: { text: `© ${new Date().getFullYear()} ${trimmed}. Все права защищены.`, links: [] },
    pages: [starterPage(trimmed)],
  };
  const site: Site = {
    id: newId('s'),
    userId,
    name: trimmed,
    slug: uniqueSlug(slugify(trimmed)),
    draftDoc: JSON.stringify(doc),
    publishedDoc: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sites).values(site).run();
  return site;
}

export function listSitesForUser(userId: string): Site[] {
  return getDb().select().from(sites).where(eq(sites.userId, userId)).orderBy(desc(sites.updatedAt)).all();
}

/** Site only if it belongs to the user — the single ownership gate for APIs. */
export function getSiteForUser(userId: string, siteId: string): Site | null {
  return (
    getDb()
      .select()
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, userId)))
      .get() ?? null
  );
}

export function getSiteBySlug(slug: string): Site | null {
  return getDb().select().from(sites).where(eq(sites.slug, slug)).get() ?? null;
}

export function getSiteByHostname(hostname: string): Site | null {
  const db = getDb();
  const row = db
    .select({ site: sites })
    .from(domains)
    .innerJoin(sites, eq(domains.siteId, sites.id))
    .where(eq(domains.hostname, hostname.toLowerCase()))
    .get();
  return row?.site ?? null;
}

export function saveDraft(site: Site, doc: BuilderDoc): void {
  getDb()
    .update(sites)
    .set({ draftDoc: JSON.stringify(doc), updatedAt: new Date() })
    .where(eq(sites.id, site.id))
    .run();
}

/** Copy the draft over the published snapshot. */
export function publishSite(site: Site): void {
  getDb()
    .update(sites)
    .set({ publishedDoc: site.draftDoc, publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(sites.id, site.id))
    .run();
}

export function unpublishSite(site: Site): void {
  getDb()
    .update(sites)
    .set({ publishedDoc: null, publishedAt: null, updatedAt: new Date() })
    .where(eq(sites.id, site.id))
    .run();
}

export function parseDoc(json: string | null): BuilderDoc | null {
  if (!json) return null;
  try {
    const doc = JSON.parse(json);
    if (doc && Array.isArray(doc.pages)) return doc as BuilderDoc;
  } catch {
    /* corrupted doc → treat as absent */
  }
  return null;
}

// ---- domains ----

/** "https://WWW.Example.com:443/x" → "www.example.com"; null if not a valid hostname. */
export function normalizeHostname(input: string): string | null {
  let h = input.trim().toLowerCase();
  h = h.replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0];
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(h)) return null;
  if (h.length > 253) return null;
  return h;
}

export function listDomains(siteId: string): Domain[] {
  return getDb().select().from(domains).where(eq(domains.siteId, siteId)).all();
}

export function addDomain(siteId: string, hostname: string): Domain {
  const domain: Domain = {
    id: newId('d'),
    siteId,
    hostname: hostname.toLowerCase(),
    verified: false,
    createdAt: new Date(),
  };
  getDb().insert(domains).values(domain).run();
  return domain;
}

export function removeDomain(siteId: string, domainId: string): boolean {
  const res = getDb()
    .delete(domains)
    .where(and(eq(domains.id, domainId), eq(domains.siteId, siteId)))
    .run();
  return res.changes > 0;
}

export function setDomainVerified(domainId: string, verified: boolean): void {
  getDb().update(domains).set({ verified }).where(eq(domains.id, domainId)).run();
}

// ---- submissions ----

export function addSubmission(siteId: string | null, formId: string, data: Record<string, unknown>): void {
  getDb()
    .insert(submissions)
    .values({ id: newId('f'), siteId, formId, data: JSON.stringify(data), createdAt: new Date() })
    .run();
}

export function listSubmissions(siteId: string, limit = 200) {
  return getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.siteId, siteId))
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .all();
}

export interface UserSubmissionRow {
  id: string;
  siteName: string;
  siteSlug: string;
  formId: string;
  data: string;
  createdAt: Date;
}

/** All submissions across every site owned by the user, newest first. */
export function listSubmissionsForUser(userId: string, limit = 300): UserSubmissionRow[] {
  const rows = getDb()
    .select({ sub: submissions, site: sites })
    .from(submissions)
    .innerJoin(sites, eq(submissions.siteId, sites.id))
    .where(eq(sites.userId, userId))
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .all();
  return rows.map(({ sub, site }) => ({
    id: sub.id,
    siteName: site.name,
    siteSlug: site.slug,
    formId: sub.formId,
    data: sub.data,
    createdAt: sub.createdAt,
  }));
}

export interface UserStats {
  sites: number;
  published: number;
  submissions: number;
}

export function statsForUser(userId: string): UserStats {
  const list = listSitesForUser(userId);
  const published = list.filter((s) => s.publishedDoc).length;
  const subs = getDb()
    .select({ n: sql<number>`count(*)` })
    .from(submissions)
    .innerJoin(sites, eq(submissions.siteId, sites.id))
    .where(eq(sites.userId, userId))
    .get();
  return { sites: list.length, published, submissions: Number(subs?.n ?? 0) };
}

// ---- link rebasing ----
// Docs authored in the studio use '/site/...' internal links (the legacy
// single-tenant base). When rendering under /s/<slug> or a custom domain the
// links are rewritten to the tenant base at render time, so the same doc works
// everywhere without touching stored data.

function rebaseHref(href: string, base: string): string {
  if (href === '/site' || href === '/site/') return base || '/';
  if (href.startsWith('/site/')) return `${base}/${href.slice('/site/'.length)}`;
  if (href.startsWith('/site?')) return `${base || '/'}${href.slice('/site'.length)}`;
  return href;
}

function rebaseNodes(nodes: BuilderNode[], base: string): BuilderNode[] {
  return nodes.map((n) => ({
    ...n,
    props: n.props?.href ? { ...n.props, href: rebaseHref(n.props.href, base) } : n.props,
    children: n.children ? rebaseNodes(n.children, base) : n.children,
  }));
}

/** base: '/s/my-site' for slug routing, '' for custom-domain root. */
export function rebaseDoc(doc: BuilderDoc, base: string): BuilderDoc {
  return {
    ...doc,
    base,
    nav: doc.nav.map((l) => ({ ...l, href: rebaseHref(l.href, base) })),
    footer: { ...doc.footer, links: doc.footer.links.map((l) => ({ ...l, href: rebaseHref(l.href, base) })) },
    pages: doc.pages.map((p) => ({ ...p, blocks: rebaseNodes(p.blocks, base) })),
  };
}

export const APP_HOST = (process.env.NEXT_PUBLIC_APP_HOST || 'localhost:3000').toLowerCase();
