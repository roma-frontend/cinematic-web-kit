import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import type { LayoutProps } from './_shared';
import { DISPLAY, ICONS, Art, PrimaryBtn, GhostBtn, Eyebrow, Footer } from './_shared';

// Arena — sport / fitness. Bento grid: a large left card (hero with decorated
// photo, stats, feature cards with photos, schedule) and a right column of
// stacked cards (why-us rows, testimonials with portraits, dark photo CTA).
export function ArenaLayout({ def, c, common, label }: LayoutProps) {
  const art = def.art ?? {};
  const grad = `bg-gradient-to-br ${def.cover}`;
  const card = 'rounded-[calc(var(--radius)*2)] border border-border bg-card';
  const whyIcons = ['users', 'calendar-clock', 'map-pin'];

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* LEFT — hero + stats + features + schedule */}
        <div className={`${card} overflow-hidden p-6 sm:p-8`}>
          <div className="flex items-center justify-between gap-4 text-sm">
            <Link href="/presets" className="inline-flex items-center gap-2 font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {common.backToPresets}
            </Link>
            <span className="font-bold" style={DISPLAY}>{label}</span>
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{common.previewBadge}</span>
          </div>

          {/* Hero */}
          <div className="mt-8 grid items-center gap-6 sm:grid-cols-2">
            <div>
              <Eyebrow>{c.hero.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl" style={DISPLAY}>{c.hero.title}</h1>
              <p className="mt-4 text-muted-foreground">{c.hero.subtitle}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
                <GhostBtn>{common.ctaSecondary}</GhostBtn>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className={`absolute right-2 top-1/2 -z-0 h-56 w-56 -translate-y-1/2 rounded-full ${grad} opacity-25 blur-2xl`} />
              <div aria-hidden className={`absolute -right-2 top-4 -z-0 h-40 w-40 rounded-full ${grad} opacity-20`} />
              <Art name={art.hero} alt={c.hero.title} eager grad={grad} className="relative aspect-square w-full rounded-[calc(var(--radius)*1.5)] shadow-xl" />
            </div>
          </div>

          {/* Stats */}
          {c.stats && (
            <div className="mt-8 grid grid-cols-3 gap-4 rounded-[calc(var(--radius)*1.25)] bg-muted/50 p-6">
              {c.stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-black tracking-tight sm:text-4xl" style={DISPLAY}>{s.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Features with photos */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {c.features.map((f, i) => {
              const Icon = ICONS[def.featureIcons[i]] ?? ICONS.sparkles;
              return (
                <div key={f.title} className="overflow-hidden rounded-[calc(var(--radius)*1.25)] border border-border bg-background">
                  <div className="p-5">
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-white ${grad}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold" style={DISPLAY}>{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                  <Art name={art.featureImages?.[i]} alt={f.title} grad={grad} className="aspect-[16/10] w-full" />
                </div>
              );
            })}
          </div>

          {/* Schedule */}
          <div className="mt-6">
            <div className="relative isolate overflow-hidden rounded-[calc(var(--radius)*1.25)] p-6 text-white">
              <Art name={art.cta} alt="" grad={grad} className="absolute inset-0 -z-10 h-full w-full" />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 to-black/40" />
              <h2 className="text-2xl font-black tracking-tight" style={DISPLAY}>{c.offer.title}</h2>
              <p className="mt-1 text-sm text-white/70">{c.offer.subtitle}</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {c.offer.items.map((item) => (
                <div key={item.name} className="rounded-[calc(var(--radius)*1.25)] border border-border bg-background p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold" style={DISPLAY}>{item.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.note}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black tracking-tight" style={DISPLAY}>{item.price}</p>
                  <ul className="mt-3 space-y-1.5">
                    {item.features.map((ft) => (
                      <li key={ft} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary" /> {ft}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — why us, testimonials, CTA */}
        <div className="flex flex-col gap-5">
          {c.whyUs && (
            <div className={`${card} p-6 sm:p-8`}>
              <h2 className="text-2xl font-black tracking-tight" style={DISPLAY}>{c.whyUs.title}</h2>
              <div className="mt-6 space-y-5">
                {c.whyUs.items.map((w, i) => {
                  const Icon = ICONS[whyIcons[i]] ?? ICONS.sparkles;
                  return (
                    <div key={w.title} className="flex gap-4">
                      <Art name={art.whyImages?.[i]} alt={w.title} grad={grad} className="h-20 w-28 shrink-0 rounded-[var(--radius)]" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)*0.6)] text-white ${grad}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <h3 className="font-bold" style={DISPLAY}>{w.title}</h3>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`${card} p-6 sm:p-8`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {c.testimonials.map((r, i) => (
                <figure key={r.name} className="rounded-[var(--radius)] border border-border bg-background p-5">
                  <div className="mb-2 flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, si) => <span key={si} className="text-sm">★</span>)}
                  </div>
                  <blockquote className="text-sm leading-relaxed">{r.quote}</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <Art name={art.avatars?.[i]} alt={r.name} grad={grad} className="h-10 w-10 shrink-0 rounded-full" />
                    <span>
                      <span className="block text-sm font-semibold">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">{r.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="relative isolate mt-auto overflow-hidden rounded-[calc(var(--radius)*2)] p-8 text-white">
            <Art name={art.cta} alt="" grad={grad} className="absolute inset-0 -z-10 h-full w-full" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
            <h2 className="max-w-xs text-balance text-3xl font-black tracking-tight" style={DISPLAY}>{c.final.title}</h2>
            <p className="mt-3 text-sm text-white/80">{c.final.subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
              <GhostBtn dark>{common.allPresets}</GhostBtn>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <Footer label={label} common={common} tone="plain" />
      </div>
    </main>
  );
}
