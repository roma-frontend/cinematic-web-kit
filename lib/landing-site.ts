import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { getDb, newId, users, sites, type Site } from '@/lib/db';
import { makeNode, newId as newNodeId, type BuilderNode, type BuilderDoc, type BuilderPage, type NodeType } from '@/lib/builder/types';
import { getLanding } from '@/lib/landing';
import { landingExtra } from '@/lib/landing-extra-dict';
import { PLAN_ORDER, formatPrice } from '@/lib/billing/plans';
import { billingDict } from '@/lib/billing-dict';
import siteConfig from '@/data/site.json';

// The landing page (/) is a normal builder site with a reserved slug, so it can
// be edited with the full visual builder (all node types, variants, hover /
// animation / effects, header/footer/user-menu chrome). Owned by the first
// (superadmin) user. Rendered at / via SiteRenderer; edited at /studio/builder.
export const LANDING_SLUG = '__landing__';

/** Whether saving a site should also update its live/published snapshot.
 *  Published sites auto-sync on every save — EXCEPT the landing (/), which must
 *  only go live via an explicit publish, so autosaves/saves never replace the
 *  hand-crafted coded showcase (WebGL hero, cursor, sticky story, marquees). */
export function syncsLiveOnSave(site: { publishedDoc: string | null; slug: string }): boolean {
  return Boolean(site.publishedDoc) && site.slug !== LANDING_SLUG;
}

const mk = (type: NodeType, props: Record<string, string> = {}, children?: BuilderNode[]): BuilderNode => {
  const node = makeNode(type);
  node.props = { ...node.props, ...props };
  if (children) node.children = children;
  return node;
};

function seedLandingDoc(): BuilderDoc {
  const year = new Date().getFullYear();
  const L = getLanding(); // same copy as the marketing landing, so it matches
  const E = landingExtra('ru');
  const bd = billingDict('ru');
  const home: BuilderPage = {
    id: newNodeId('page'),
    path: '',
    title: 'Главная',
    description: L.hero.subtitle,
    blocks: [
      // Hero — the REAL coded hero rendered as a builder block (WebGL bg, glass
      // browser mock, animated word-stagger headline, magnetic CTA). Editable
      // via the block's fields; keeps all its effects when saved/published.
      mk('landingHero', {
        badge: L.hero.badge,
        title: L.hero.title,
        subtitle: L.hero.subtitle,
        ctaPrimaryLabel: L.hero.ctaPrimaryLabel,
        ctaPrimaryHref: L.hero.ctaPrimaryHref,
        ctaSecondaryLabel: L.hero.ctaSecondaryLabel,
        ctaSecondaryHref: L.hero.ctaSecondaryHref,
        microcopy: E.cta.microcopy,
        previewUrl: E.heroPreviewLabels.url,
        previewPublish: E.heroPreviewLabels.publish,
      }),
      // How it works — numbered glass cards on a grid pattern
      mk('section', { padding: 'lg', bg: 'none', width: 'wide', fx: 'grid' }, [
        mk('heading', { text: L.steps.title, level: '2', align: 'center', animate: 'fade', gradient: 'true' }),
        mk('text', { text: L.steps.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, L.steps.items.map((s) =>
          mk('card', { cardVariant: 'glass', padding: 'md', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('text', { text: s.n, align: 'left', textColor: 'primary', fontSize: '4xl', fontWeight: 'bold' }),
            mk('heading', { text: s.title, level: '3', align: 'left' }),
            mk('text', { text: s.text, align: 'left', muted: 'true' }),
          ]),
        )),
      ]),
      // Features — bento-style glass cards
      mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
        mk('heading', { text: L.features.title, level: '2', align: 'center', animate: 'fade', gradient: 'true' }),
        mk('text', { text: E.bento.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, E.bento.items.map((f) =>
          mk('card', { padding: 'md', cardVariant: 'glass', gap: 'sm', animate: 'slide-up', hover: 'lift' }, [
            mk('heading', { text: f.title, level: '3', align: 'left' }),
            mk('text', { text: f.text, align: 'left', muted: 'true' }),
          ]),
        )),
      ]),
      // Live stats — count-up counters on a dotted field
      mk('section', { padding: 'lg', bg: 'none', width: 'wide', fx: 'dots' }, [
        mk('heading', { text: E.stats.title, level: '2', align: 'center', animate: 'fade', gradient: 'true' }),
        mk('text', { text: E.stats.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '4', stagger: 'true' }, E.stats.items.map((s) =>
          mk('counter', { value: s.value, label: s.label, align: 'center', animate: 'zoom' }),
        )),
      ]),
      // Themes teaser + live gallery
      mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
        mk('heading', { text: L.themesTeaser.title, level: '2', align: 'center', gradient: 'true' }),
        mk('text', { text: L.themesTeaser.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('themeGallery', { count: '6', columns: '3' }),
      ]),
      // Testimonials
      mk('section', { padding: 'lg', bg: 'none', width: 'wide' }, [
        mk('heading', { text: E.testimonials.title, level: '2', align: 'center', animate: 'fade', gradient: 'true' }),
        mk('text', { text: E.testimonials.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, E.testimonials.items.slice(0, 6).map((t) =>
          mk('testimonial', { quote: t.quote, author: t.name, role: t.role, quoteVariant: 'card', animate: 'slide-up' }),
        )),
      ]),
      // Made on the platform — video examples
      mk('section', { padding: 'lg', bg: 'muted', width: 'wide' }, [
        mk('heading', { text: 'Пример живого сайта', level: '2', align: 'center', gradient: 'true' }),
        mk('text', { text: 'Эти секции с ИИ-видео собраны прямо в Студии — так выглядит результат.', align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('videoGrid', { count: '6' }),
      ]),
      // Pricing — editable plan cards (mirrors /pricing)
      mk('section', { padding: 'lg', bg: 'none', width: 'wide', fx: 'aurora' }, [
        mk('heading', { text: bd.pricing.title, level: '2', align: 'center', animate: 'fade', gradient: 'true' }),
        mk('text', { text: bd.pricing.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('grid', { gap: 'md', columns: '3', stagger: 'true' }, PLAN_ORDER.map((p) =>
          mk('pricing', {
            plan: bd.planName[p.id],
            price: formatPrice(p.price.month, p.currency),
            period: bd.pricing.perMonth,
            features: [
              p.limits.sites === null ? bd.limits.sitesUnlimited : bd.limits.sites.replace('{n}', String(p.limits.sites)),
              ...p.features.map((f) => bd.feature[f]),
            ].join('\n'),
            cta: bd.pricing.choose,
            href: `/checkout/${p.id}`,
            featured: p.popular ? 'true' : 'false',
            priceVariant: 'card',
          }),
        )),
      ]),
      // FAQ
      mk('section', { padding: 'lg', bg: 'muted', width: 'normal' }, [
        mk('heading', { text: E.faq.title, level: '2', align: 'center', gradient: 'true' }),
        mk('text', { text: E.faq.subtitle, align: 'center', muted: 'true' }),
        mk('spacer', { height: 'md' }),
        mk('faq', { items: E.faq.items.map((f) => `${f.q}::${f.a}`).join('\n'), align: 'left', faqVariant: 'bordered' }),
      ]),
      // Final CTA — WebGL banner + gradient headline + shimmer CTA
      mk('section', { padding: 'lg', bg: 'card', width: 'normal', fx: 'webgl' }, [
        mk('stack', { gap: 'sm', align: 'center' }, [
          mk('heading', { text: L.finalCta.title, level: '2', align: 'center', gradient: 'true' }),
          mk('text', { text: L.finalCta.subtitle, align: 'center', muted: 'true' }),
          mk('row', { gap: 'sm', align: 'center', justify: 'center', wrap: 'wrap' }, [
            mk('button', { text: L.finalCta.ctaPrimaryLabel, href: L.finalCta.ctaPrimaryHref, variant: 'default', size: 'lg', align: 'center', type: 'link', hover: 'lift', shimmer: 'true' }),
            mk('button', { text: L.finalCta.ctaSecondaryLabel, href: L.finalCta.ctaSecondaryHref, variant: 'outline', size: 'lg', align: 'center', type: 'link', hover: 'lift' }),
          ]),
          mk('text', { text: E.cta.microcopy, align: 'center', muted: 'true', size: 'sm' }),
        ]),
      ]),
    ],
  };

  return {
    brand: 'Builder Studio',
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
      text: `© ${year} Builder Studio. Все права защищены.`,
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
    dashboardTheme: '',
    suppressedPlans: '[]',
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sites).values(site).run();
  return site;
}

/** Reset the landing to its initial seeded state: a fresh premium draft, and
 *  UNPUBLISHED (published_doc/at cleared) so / returns to the coded showcase
 *  with all its effects. Keeps the same row id, so an already-open builder tab
 *  stays valid. Returns null only if there is no landing and no user to own one. */
export function resetLandingSite(): Site | null {
  const existing = getLandingSite();
  if (!existing) return getOrCreateLandingSite();
  const db = getDb();
  const now = new Date();
  const json = JSON.stringify(seedLandingDoc());
  db.update(sites)
    .set({ draftDoc: json, publishedDoc: null, publishedAt: null, updatedAt: now })
    .where(eq(sites.id, existing.id))
    .run();
  return { ...existing, draftDoc: json, publishedDoc: null, publishedAt: null, updatedAt: now };
}
