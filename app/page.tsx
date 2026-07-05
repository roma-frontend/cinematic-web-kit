import Link from 'next/link';
import mediaData from '@/data/media.json';
import type { MediaEntry } from '@/lib/media';
import { ThemeStyle } from '@/components/theme-style';
import { THEMES } from '@/lib/themes';
import { activeSiteTheme } from '@/lib/site-theme';
import { ThemeFX } from '@/components/theme-fx';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { VideoCardGrid } from '@/components/media/video-card';
import { getLanding } from '@/lib/landing';
import { getLandingSite } from '@/lib/landing-site';
import { parseDoc, rebaseDoc } from '@/lib/sites';
import { SiteRenderer, findPageByPath } from '@/components/builder/site-renderer';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Wand2, Palette, LayoutTemplate, Globe, Video, ArrowRight, Check,
} from 'lucide-react';

const ok = (v: string) => `oklch(${v})`;

const STEP_ICONS = [Wand2, LayoutTemplate, Globe];
const FEATURE_ICONS = [Video, Palette, LayoutTemplate, Globe];

export const dynamic = 'force-dynamic';

export default function Home() {
  // If the landing has been opened in the visual builder, it becomes a normal
  // builder site (reserved slug) and renders through the same renderer as
  // /s/<slug> — fully editable (chrome, variants, effects). Until then, the
  // marketing page below is shown.
  const landingSite = getLandingSite();
  const builderDoc = landingSite ? parseDoc(landingSite.publishedDoc) : null;
  if (builderDoc) {
    const doc = rebaseDoc(builderDoc, '');
    const page = findPageByPath(doc, []);
    if (page) return <SiteRenderer doc={doc} page={page} />;
  }

  const media = mediaData as MediaEntry[];
  const theme = activeSiteTheme();
  const examples = media.slice(0, 6);
  const L = getLanding();

  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-20 text-center sm:px-10 sm:py-24">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {L.hero.badge}
          </span>
          <h1 className="mx-auto max-w-4xl text-balance font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            {L.hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            {L.hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={L.hero.ctaPrimaryHref}>
              <Button size="lg" className="gap-2 shadow-lg">
                <Sparkles className="h-5 w-5" /> {L.hero.ctaPrimaryLabel}
              </Button>
            </Link>
            <Link href={L.hero.ctaSecondaryHref}>
              <Button size="lg" variant="outline" className="gap-2">
                {L.hero.ctaSecondaryLabel} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{L.hero.note}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{L.steps.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{L.steps.subtitle}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {L.steps.items.map((s, i) => {
            const Icon = STEP_ICONS[i] ?? Wand2;
            return (
            <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display text-3xl font-black text-muted-foreground/25">{s.n}</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{L.features.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{L.features.subtitle}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {L.features.items.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Video;
            return (
            <div key={f.title} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur transition-colors hover:border-primary/50">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
            );
          })}
        </div>
      </section>

      {/* Themes gallery teaser */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{L.themesTeaser.title}</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{L.themesTeaser.subtitle}</p>
          </div>
          <Link href="/themes">
            <Button variant="outline" size="sm" className="gap-1.5">Все темы <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.slice(0, 6).map((t) => {
            const d = t.dark;
            return (
              <Link
                key={t.id}
                href="/themes"
                className="group overflow-hidden rounded-2xl border shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ background: ok(d.background), color: ok(d.foreground), borderColor: t.id === theme.id ? ok(d.primary) : ok(d.border) }}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold tracking-tight">{t.label}</span>
                    {t.id === theme.id && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: ok(d.primary), color: ok(d['primary-foreground']) }}>
                        <Check className="h-3 w-3" /> активна
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: ok(d['muted-foreground']) }}>{t.fontDisplay} · движение {t.motion}</p>
                  <div className="mt-4 flex gap-2">
                    {[d.primary, d.card, d.muted, d.foreground, d.border].map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-md" style={{ background: ok(c), border: `1px solid ${ok(d.border)}` }} />
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Made on the platform — real example from demo content */}
      {examples.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Video className="h-3.5 w-3.5 text-primary" /> Сделано на платформе
            </span>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Пример живого сайта</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Эти секции с ИИ-видео собраны прямо в Студии — так выглядит результат.
            </p>
          </div>
          <VideoCardGrid entries={examples} />
        </section>
      )}

      {/* Final CTA */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-20 sm:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-10 text-center backdrop-blur sm:p-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(60% 60% at 50% 0%, var(--primary), transparent 70%)' }} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-black tracking-tight sm:text-4xl">
              {L.finalCta.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              {L.finalCta.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href={L.finalCta.ctaPrimaryHref}>
                <Button size="lg" className="gap-2 shadow-lg"><Sparkles className="h-5 w-5" /> {L.finalCta.ctaPrimaryLabel}</Button>
              </Link>
              <Link href={L.finalCta.ctaSecondaryHref}>
                <Button size="lg" variant="outline" className="gap-2"><LayoutTemplate className="h-5 w-5" /> {L.finalCta.ctaSecondaryLabel}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}
