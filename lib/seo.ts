// Central SEO constants and URL helpers. Kept dependency-free (no DB / no
// server-only) so it can be imported from layouts, pages, route handlers and
// metadata alike.
//
// i18n readiness: the platform UI will be translated to Russian + English.
// LOCALES / DEFAULT_LOCALE / OG_LOCALE are declared here so that when localized
// routes (e.g. /ru, /en) are introduced, hreflang alternates and per-locale
// metadata can be wired up in one place without touching every page.

import type { Metadata } from 'next';

export const SITE_NAME = 'Cinematic Web Kit';

export const DEFAULT_DESCRIPTION =
  'Конструктор сайтов с кинематографичными видео-секциями. Соберите лендинг из AI-видео, ' +
  'опубликуйте на своём поддомене или домене — без кода.';
export const DEFAULT_DESCRIPTION_EN =
  'A visual website builder with cinematic AI-video sections. Compose a landing page from ' +
  'generated clips and publish it to your subdomain or custom domain — no code.';

export const KEYWORDS = [
  'конструктор сайтов',
  'AI видео',
  'кинематографичный лендинг',
  'website builder',
  'cinematic video',
  'AI video background',
  'no-code',
  'landing page builder',
];

// ── i18n scaffold ───────────────────────────────────────────────────────────
export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ru';
export const OG_LOCALE: Record<Locale, string> = { ru: 'ru_RU', en: 'en_US' };

// ── URLs ──────────────────────────────────────────────────────────────────
const APP_HOST = (process.env.NEXT_PUBLIC_APP_HOST || 'localhost:3000').toLowerCase();
const IS_LOCAL = /^(localhost|127\.|\[::)/.test(APP_HOST);
export const PROTOCOL = IS_LOCAL ? 'http' : 'https';
export const APP_URL = `${PROTOCOL}://${APP_HOST}`;

/** Canonical URL of a tenant site served on its own subdomain. */
export function subdomainUrl(slug: string, path = ''): string {
  const [host, port] = APP_HOST.split(':');
  const suffix = port ? `:${port}` : '';
  const p = path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${PROTOCOL}://${slug}.${host}${suffix}${p}`;
}

/**
 * hreflang alternates for a path. Until localized routes exist this is a no-op
 * (returns undefined); flip it on once /ru and /en routes are added.
 */
export function localeAlternates(_path = '/'): Metadata['alternates'] {
  return undefined;
}

// ── Structured data (JSON-LD) ───────────────────────────────────────────────
/** WebSite graph for a published tenant site. */
export function tenantJsonLd(brand: string, url: string, description?: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand,
    url,
    ...(description ? { description } : {}),
  };
}

/** Organization + WebSite graph for the marketing site. */
export function siteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
        name: SITE_NAME,
        url: APP_URL,
        logo: `${APP_URL}/icon.svg`,
        description: DEFAULT_DESCRIPTION,
      },
      {
        '@type': 'WebSite',
        '@id': `${APP_URL}/#website`,
        name: SITE_NAME,
        url: APP_URL,
        description: DEFAULT_DESCRIPTION,
        inLanguage: LOCALES.map((l) => (l === 'ru' ? 'ru-RU' : 'en-US')),
        publisher: { '@id': `${APP_URL}/#organization` },
      },
    ],
  };
}
