import Link from 'next/link';
import mediaData from '@/data/media.json';
import type { MediaEntry } from '@/lib/media';
import { presetHrefFromSources } from '@/lib/media';
import { ThemeStyle } from '@/components/theme-style';
import { THEMES, getTheme } from '@/lib/themes';
import { activeSiteTheme } from '@/lib/site-theme';
import { ThemeFX } from '@/components/theme-fx';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { VideoCardGrid } from '@/components/media/video-card';
import { getLanding } from '@/lib/landing';
import { landingExtra } from '@/lib/landing-extra-dict';
import { getLocale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { ui } from '@/lib/ui-dict';
import { getLandingSite } from '@/lib/landing-site';
import { parseDoc } from '@/lib/sites';
import type { BuilderDoc, BuilderNode } from '@/lib/builder/types';
import { translateAuto } from '@/lib/auto-translate';
import { mediaFromRemote, mediaUrl } from '@/lib/media-url';
import type { Locale } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { PricingCards } from '@/components/billing/pricing-cards';
import { billingDict } from '@/lib/billing-dict';
import { getActiveSubscription } from '@/lib/billing/subscriptions';
import { getEffectivePlans } from '@/lib/billing/plan-config';
import type { PlanId } from '@/lib/billing/plans';
import { LandingHero } from '@/components/landing/landing-hero';
import { CursorGlow } from '@/components/landing/cursor-glow';
import { StickyShowcase } from '@/components/landing/sticky-showcase';
import {
  ScrollProgress,
  MarqueeBand,
  BentoFeatures,
  StatsBand,
  Testimonials,
  Faq,
  MotionReveal,
} from '@/components/landing/landing-sections';
import { Tilt } from '@/components/fx/tilt';
import { Magnetic } from '@/components/fx/magnetic';
import { Beams } from '@/components/fx/beams';
import {
  Sparkles, Wand2, Palette, LayoutTemplate, Globe, Video, ArrowRight, Check, Users,
} from 'lucide-react';

const ok = (v: string) => `oklch(${v})`;

export const dynamic = 'force-dynamic';

/**
 * The homepage (/) is always the coded, fully-localized marketing page so the
 * language switcher keeps working. Any landing built/published in the visual
 * builder contributes ONLY its custom media grid ("Пример живого сайта") — this
 * pulls those items (with per-theme dark variants) out of the builder document.
 * Text on / stays dictionary-driven, so publishing edits never breaks i18n.
 */
function landingHeroProps(doc: BuilderDoc | null): Record<string, string> {
  if (!doc) return {};
  const findHero = (nodes: BuilderNode[]): BuilderNode | null => {
    for (const node of nodes) {
      if (node.type === 'landingHero') return node;
      const nested = findHero(node.children ?? []);
      if (nested) return nested;
    }
    return null;
  };
  return findHero(doc.pages.flatMap((page) => page.blocks))?.props ?? {};
}

async function landingGridEntries(doc: BuilderDoc, locale: Locale): Promise<MediaEntry[]> {
  let grid: BuilderNode | null = null;
  const walk = (n: BuilderNode) => {
    if (!grid && n.type === 'videoGrid') grid = n;
    (n.children ?? []).forEach(walk);
  };
  for (const pg of doc.pages) pg.blocks.forEach(walk);
  const items = (grid as BuilderNode | null)?.props?.items;
  if (!items) return [];
  const rows = items
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries = await Promise.all(
    rows.map(async (l, i): Promise<MediaEntry | null> => {
      const [src = '', title = '', subtitle = '', poster = '', srcDark = '', posterDark = ''] = l.split('::').map((s) => s.trim());
      if (!src && !srcDark) return null;
      const [tTitle, tSubtitle] = await Promise.all([
        translateAuto(title, locale),
        subtitle ? translateAuto(subtitle, locale) : Promise.resolve(''),
      ]);
      return {
        id: `landing-grid-${i}`,
        title: tTitle,
        section: 'card',
        src: src || srcDark,
        subtitle: tSubtitle || undefined,
        poster: poster || undefined,
        srcDark: srcDark || undefined,
        posterDark: posterDark || undefined,
        aspectRatio: '16:9',
        href: presetHrefFromSources(src, srcDark, poster, posterDark),
      };
    }),
  );
  return entries.filter((e): e is MediaEntry => e !== null);
}

export default async function Home() {
  const media = mediaData as MediaEntry[];
  // Keep / on the localized coded page; only borrow the builder landing's media
  // grid so custom uploads (and their dark variants) show without disabling i18n.
  const landingSite = getLandingSite();
  const landingDoc = landingSite ? parseDoc(landingSite.publishedDoc) : null;
  // Theme priority: the theme chosen & published for the landing in the Studio
  // builder (doc.themeId) wins so switching themes there actually re-skins /;
  // otherwise fall back to the site-wide / auto-derived theme.
  const theme = landingDoc?.themeId && landingDoc.themeId !== 'auto'
    ? getTheme(landingDoc.themeId)
    : activeSiteTheme();
  const locale = await getLocale();
  const gridEntries = landingDoc ? await landingGridEntries(landingDoc, locale) : [];
  const examples = (gridEntries.length ? gridEntries : media).slice(0, 6);
  const L = getLanding(locale);
  const dict = ui(locale);
  // A published Builder landing may customize the visual hero. Only use its
  // fields when present; the localized coded landing remains the fallback.
  const publishedHero = landingHeroProps(landingDoc);
  const [heroBadge, heroTitle, heroSubtitle, heroPrimaryLabel, heroSecondaryLabel, heroMicrocopy, heroPreviewUrl, heroPreviewPublish] = await Promise.all([
    translateAuto(publishedHero.badge || L.hero.badge, locale),
    translateAuto(publishedHero.title || L.hero.title, locale),
    translateAuto(publishedHero.subtitle || L.hero.subtitle, locale),
    translateAuto(publishedHero.ctaPrimaryLabel || L.hero.ctaPrimaryLabel, locale),
    translateAuto(publishedHero.ctaSecondaryLabel || L.hero.ctaSecondaryLabel, locale),
    publishedHero.microcopy ? translateAuto(publishedHero.microcopy, locale) : Promise.resolve(''),
    publishedHero.previewUrl ? translateAuto(publishedHero.previewUrl, locale) : Promise.resolve(''),
    publishedHero.previewPublish ? translateAuto(publishedHero.previewPublish, locale) : Promise.resolve(''),
  ]);
  const heroCopy = {
    badge: heroBadge,
    title: heroTitle,
    subtitle: heroSubtitle,
    primaryLabel: heroPrimaryLabel,
    primaryHref: publishedHero.ctaPrimaryHref || L.hero.ctaPrimaryHref,
    secondaryLabel: heroSecondaryLabel,
    secondaryHref: publishedHero.ctaSecondaryHref || L.hero.ctaSecondaryHref,
    microcopy: heroMicrocopy,
    previewUrl: heroPreviewUrl,
    previewPublish: heroPreviewPublish,
  };

  // When a platform user is signed in, the marketing "sign up" CTAs make no
  // sense — point them at the dashboard instead and relabel accordingly.
  const me = await getCurrentUser();
  const heroPrimary = me
    ? { label: dict.actions.openDashboard, href: '/dashboard' }
    : { label: heroCopy.primaryLabel, href: heroCopy.primaryHref };
  const finalPrimary = me
    ? { label: dict.actions.openDashboard, href: '/dashboard' }
    : { label: L.finalCta.ctaPrimaryLabel, href: L.finalCta.ctaPrimaryHref };

  // Pricing section (marketing) — reuses the real pricing cards + checkout flow.
  const B = billingDict(locale);
  const planCards = getEffectivePlans();
  const currentPlan = (me ? getActiveSubscription(me.id)?.planId : undefined) as PlanId | undefined;

  // Extra copy + derived data for the effects-rich sections.
  const extra = landingExtra(locale);
  const heroSecondary = { label: heroCopy.secondaryLabel, href: heroCopy.secondaryHref };
  const microItems = (heroCopy.microcopy || extra.cta.microcopy).split('·').map((s) => s.trim()).filter(Boolean);
  const swatches = THEMES.slice(0, 4).map((t) => ({
    id: t.id,
    label: t.label,
    colors: [ok(t.light.primary), ok(t.dark.primary), ok(t.light.muted)],
  }));
  const bentoIcons = [
    <Wand2 key="0" className="h-6 w-6" />,
    <Video key="1" className="h-6 w-6" />,
    <Sparkles key="2" className="h-6 w-6" />,
    <Palette key="3" className="h-6 w-6" />,
    <Globe key="4" className="h-6 w-6" />,
    <Users key="5" className="h-6 w-6" />,
  ];

  return (
    <>
      <a href="#main-content" className="skip-link">{dict.a11y.skipContent}</a>
      <main id="main-content" className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <CursorGlow />
      <ScrollProgress />
      <SiteHeader initialUser={me ? { name: me.name, email: me.email, role: me.role as 'customer' | 'admin' | 'superadmin' } : null} />


      <LandingHero
        badge={heroCopy.badge}
        title={heroCopy.title}
        subtitle={heroCopy.subtitle}
        primary={heroPrimary}
        secondary={heroSecondary}
        microItems={microItems}
        previewLabels={{
          url: heroCopy.previewUrl || extra.heroPreviewLabels.url,
          publish: heroCopy.previewPublish || extra.heroPreviewLabels.publish,
        }}
        swatches={swatches}
        heroVideo={{
          src: mediaUrl('/generated/hero/hero-landing.webm'),
          srcMp4: mediaUrl('/generated/hero/hero-landing.mp4'),
          poster: mediaUrl('/generated/hero/hero-landing-poster.jpg'),
        }}
      />

      <MarqueeBand words={extra.marquee} label={extra.trustedBy} />

      {/* How it works — pinned scroll story */}
      <StickyShowcase
        title={L.steps.title}
        subtitle={L.steps.subtitle}
        steps={L.steps.items}
        // R2-only screenshots: without NEXT_PUBLIC_MEDIA_BASE_URL, missing local
        // /generated/steps/* can crash next/image's native optimizer in CI.
        shots={
          mediaFromRemote()
            ? [1, 2, 3].map((n) => ({
                light: mediaUrl(`/generated/steps/step-${n}-light.webp`),
                dark: mediaUrl(`/generated/steps/step-${n}-dark.webp`),
              }))
            : []
        }
      />

      {/* Features — bento grid */}
      <BentoFeatures title={L.features.title} subtitle={L.features.subtitle} items={extra.bento.items} icons={bentoIcons} />

      {/* Live stats */}
      <StatsBand title={extra.stats.title} subtitle={extra.stats.subtitle} items={extra.stats.items} />

      {/* Themes gallery teaser */}
      <section id="themes" className="cv-section mx-auto max-w-[var(--container-max)] scroll-mt-24 px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{L.themesTeaser.title}</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{L.themesTeaser.subtitle}</p>
          </div>
          <Link href="/themes">
            <Button variant="outline" size="sm" className="gap-1.5">{dict.actions.allThemes} <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.slice(0, 6).map((t, i) => {
            const cls = `tct-${t.id}`;
            const pv = (p: Record<string, string>) => ([
              ['bg', p.background], ['fg', p.foreground], ['primary', p.primary], ['pfg', p['primary-foreground']],
              ['card', p.card], ['muted', p.muted], ['mfg', p['muted-foreground']], ['border', p.border],
            ] as [string, string][]).map(([k, v]) => `--tp-${k}:${ok(v)}`).join(';');
            const css = `.${cls}{${pv(t.light)}}.dark .${cls}{${pv(t.dark)}}`;
            const activeCard = t.id === theme.id;
            return (
              <MotionReveal key={t.id} delay={(i % 3) * 0.08}>
                <Tilt className="h-full">
                  <Link
                    href={`/themes/${t.id}`}
                    className={`${cls} group block h-full overflow-hidden rounded-2xl border shadow-sm`}
                    style={{ background: 'var(--tp-bg)', color: 'var(--tp-fg)', borderColor: activeCard ? 'var(--tp-primary)' : 'var(--tp-border)' }}
                  >
                    <style dangerouslySetInnerHTML={{ __html: css }} />
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold tracking-tight">{t.label}</span>
                        {activeCard && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--tp-primary)', color: 'var(--tp-pfg)' }}>
                            <Check className="h-3 w-3" /> {dict.active}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'var(--tp-mfg)' }}>{t.fontDisplay} · {dict.motion} {t.motion}</p>
                      <div className="mt-4 flex gap-2">
                        {['var(--tp-primary)', 'var(--tp-card)', 'var(--tp-muted)', 'var(--tp-fg)', 'var(--tp-border)'].map((c, j) => (
                          <span key={j} className="h-6 w-6 rounded-md" style={{ background: c, border: '1px solid var(--tp-border)' }} />
                        ))}
                      </div>
                    </div>
                  </Link>
                </Tilt>
              </MotionReveal>
            );
          })}
        </div>
      </section>

      {/* Made on the platform — real example from demo content */}
      {examples.length > 0 && (
        <section id="examples" className="cv-section mx-auto max-w-[var(--container-max)] scroll-mt-24 px-6 py-16 sm:px-10 sm:py-20">
          <MotionReveal className="mb-12 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Video className="h-3.5 w-3.5 text-primary" /> {dict.examples.badge}
            </span>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{dict.examples.title}</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              {dict.examples.subtitle}
            </p>
          </MotionReveal>
          <VideoCardGrid entries={examples} />
        </section>
      )}

      {/* Testimonials */}
      <Testimonials title={extra.testimonials.title} subtitle={extra.testimonials.subtitle} items={extra.testimonials.items} />

      {/* Pricing */}
      <section id="pricing" className="cv-section mx-auto max-w-[var(--container-max)] scroll-mt-24 px-6 py-16 sm:px-10 sm:py-20">
        <MotionReveal className="mb-12 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {B.pricing.title}
          </span>
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{B.pricing.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{B.pricing.subtitle}</p>
        </MotionReveal>
        <PricingCards currentPlan={currentPlan ?? null} plans={planCards} />
      </section>

      {/* FAQ (+ FAQPage structured data → rich results in search) */}
      <Faq title={extra.faq.title} subtitle={extra.faq.subtitle} items={extra.faq.items} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: extra.faq.items.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      {/* Final CTA */}
      <section className="cv-section mx-auto max-w-[var(--container-max)] px-6 py-20 sm:px-10">
        <MotionReveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/60 p-10 text-center backdrop-blur sm:p-16">
            <Beams className="opacity-60" />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(60% 60% at 50% 0%, var(--primary), transparent 70%)' }} />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-black tracking-tight sm:text-5xl">
                {L.finalCta.title}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                {L.finalCta.subtitle}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Magnetic>
                  <Link href={finalPrimary.href}>
                    <Button size="lg" className="b-shimmer gap-2 shadow-xl shadow-primary/25"><Sparkles className="h-5 w-5" /> {finalPrimary.label}</Button>
                  </Link>
                </Magnetic>
                <Link href={L.finalCta.ctaSecondaryHref}>
                  <Button size="lg" variant="outline" className="gap-2 backdrop-blur"><LayoutTemplate className="h-5 w-5" /> {L.finalCta.ctaSecondaryLabel}</Button>
                </Link>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">{extra.cta.microcopy}</p>
            </div>
          </div>
        </MotionReveal>
      </section>

      {/* Footer */}
      <SiteFooter />
      </main>
    </>
  );
}
