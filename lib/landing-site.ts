import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { getDb, newId, users, sites, type Site } from '@/lib/db';
import { makeNode, newId as newNodeId, type BuilderNode, type BuilderDoc, type BuilderPage, type NodeType } from '@/lib/builder/types';
import { getLanding } from '@/lib/landing';
import siteConfig from '@/data/site.json';

// The landing page (/) is a normal builder site with a reserved slug, so it can
// be edited with the full visual builder (all node types, variants, hover /
// animation / effects, header/footer/user-menu chrome). Owned by the first
// (superadmin) user. Rendered at / via SiteRenderer; edited at /studio/builder.
export const LANDING_SLUG = '__landing__';

const mk = (type: NodeType, props: Record<string, string> = {}, children?: BuilderNode[]): BuilderNode => {
  const node = makeNode(type);
  node.props = { ...node.props, ...props };
  if (children) node.children = children;
  return node;
};

function seedLandingDoc(): BuilderDoc {
  const year = new Date().getFullYear();
  const L = getLanding(); // same copy as the marketing landing, so it matches
  const home: BuilderPage = {
    id: newNodeId('page'),
    path: '',
    title: 'Главная',
    description: L.hero.subtitle,
    blocks: [
      // Hero — mirrors the marketing hero
      mk('section', { padding: 'lg', bg: 'none', width: 'normal' }, [
        mk('stack', { gap: 'md', align: 'center' }, [
          mk('text', { text: L.hero.badge, align: 'center', muted: 'true', size: 'sm' }),
          mk('heading', { text: L.hero.title, level: '1', align: 'center', animate: 'slide-up' }),
          mk('text', { text: L.hero.subtitle, align: 'center', size: 'lg', animate: 'fade' }),
          mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
            mk('button', { text: L.hero.ctaPrimaryLabel, href: L.hero.ctaPrimaryHref, variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
            mk('button', { text: L.hero.ctaSecondaryLabel, href: L.hero.ctaSecondaryHref, variant: 'outline', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
          ]),
          mk('text', { text: L.hero.note, align: 'center', muted: 'true', size: 'sm' }),
        ]),
      ]),
      // How it works — numbered cards
      mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
        mk('heading', { text: L.steps.title, level: '2', align: 'center', animate: 'fade' }),
        mk('text', { text: L.steps.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, L.steps.items.map((s) =>
          mk('card', { cardVariant: 'outline', padding: 'md', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('heading', { text: s.n, level: '1', align: 'left', textColor: 'primary' }),
            mk('heading', { text: s.title, level: '3', align: 'left' }),
            mk('text', { text: s.text, align: 'left', muted: 'true' }),
          ]),
        )),
      ]),
      // Features — 4 cards
      mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
        mk('heading', { text: L.features.title, level: '2', align: 'center', animate: 'fade' }),
        mk('text', { text: L.features.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '4', stagger: 'true' }, L.features.items.map((f) =>
          mk('card', { padding: 'md', cardVariant: 'elevated', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('heading', { text: f.title, level: '3', align: 'left' }),
            mk('text', { text: f.text, align: 'left', muted: 'true' }),
          ]),
        )),
      ]),
      // Themes teaser + live gallery
      mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
        mk('heading', { text: L.themesTeaser.title, level: '2', align: 'center' }),
        mk('text', { text: L.themesTeaser.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('themeGallery', { count: '6', columns: '3' }),
      ]),
      // Made on the platform — video examples
      mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
        mk('heading', { text: 'Пример живого сайта', level: '2', align: 'center' }),
        mk('text', { text: 'Эти секции с ИИ-видео собраны прямо в Студии — так выглядит результат.', align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('videoGrid', { count: '6' }),
      ]),
      // Final CTA
      mk('section', { padding: 'lg', bg: 'card', width: 'normal' }, [
        mk('stack', { gap: 'sm', align: 'center' }, [
          mk('heading', { text: L.finalCta.title, level: '2', align: 'center' }),
          mk('text', { text: L.finalCta.subtitle, align: 'center', muted: 'true' }),
          mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
            mk('button', { text: L.finalCta.ctaPrimaryLabel, href: L.finalCta.ctaPrimaryHref, variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
            mk('button', { text: L.finalCta.ctaSecondaryLabel, href: L.finalCta.ctaSecondaryHref, variant: 'outline', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
          ]),
        ]),
      ]),
    ],
  };

  return {
    brand: 'Cinematic Web Kit',
    themeId: (siteConfig as { theme?: string }).theme || 'editorial-coffee',
    headerVariant: 'split',
    headerBehavior: 'sticky',
    footerVariant: 'columns',
    asideVariant: 'none',
    authButtons: 'false', // platform landing uses its own nav links, not tenant auth
    nav: [
      { label: 'Темы', href: '/themes' },
      { label: 'Конструктор', href: '/studio/builder' },
      { label: 'Студия', href: '/studio' },
      { label: 'Войти', href: '/login' },
    ],
    footer: {
      text: `© ${year} Cinematic Web Kit. Все права защищены.`,
      links: [
        { label: 'Темы', href: '/themes' },
        { label: 'Студия', href: '/studio' },
        { label: 'Войти', href: '/login' },
      ],
    },
    pages: [home],
  };
}

/** The reserved landing site, or null if it does not exist yet. */
export function getLandingSite(): Site | null {
  return getDb().select().from(sites).where(eq(sites.slug, LANDING_SLUG)).get() ?? null;
}

/** Get the landing site, creating a seeded (published) one on first call — a
 *  faithful copy of the marketing landing, so opening it in the builder shows
 *  the real landing and every save keeps / in sync.
 *  Returns null only if there is no user yet to own it. */
export function getOrCreateLandingSite(): Site | null {
  const db = getDb();
  const existing = getLandingSite();
  if (existing) return existing;
  const owner = db.select().from(users).orderBy(asc(users.createdAt)).get();
  if (!owner) return null; // no users yet — landing falls back to marketing
  const doc = seedLandingDoc();
  const now = new Date();
  const json = JSON.stringify(doc);
  const site: Site = {
    id: newId('s'),
    userId: owner.id,
    name: 'Лендинг (главная)',
    slug: LANDING_SLUG,
    draftDoc: json,
    publishedDoc: null, // draft only — / stays the coded landing until the
    publishedAt: null,  // editor explicitly hits "Опубликовать" (no accidental flips)
    memberApproval: true,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sites).values(site).run();
  return site;
}
