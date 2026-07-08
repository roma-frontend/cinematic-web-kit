import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import type { LayoutProps } from './_shared';
import { DISPLAY, Art, PrimaryBtn, GhostBtn, Eyebrow, BrandNav, Footer } from './_shared';

// Pulse — music / nightlife, magenta neon. Bento grid: a left card (nav,
// circular hero, stats, past-events gallery) and a right column (artist row,
// schedule cards, testimonials, dark photographic CTA).
export function PulseLayout({ def, c, common, label }: LayoutProps) {
  const art = def.art ?? {};
  const grad = `bg-gradient-to-br ${def.cover}`;
  const card = 'rounded-[calc(var(--radius)*2)] border border-border bg-card';

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        {/* LEFT — hero + stats + past events */}
        <div className={`${card} overflow-hidden p-6 sm:p-8`}>
          <BrandNav label={label} nav={c.nav} />

          <div className="mt-8 grid items-center gap-6 sm:grid-cols-[1.1fr_1fr]">
            <div>
              <Eyebrow>{c.hero.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-balance text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl" style={DISPLAY}>{c.hero.title}</h1>
              <p className="mt-4 text-muted-foreground">{c.hero.subtitle}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
                <GhostBtn>{common.ctaSecondary}</GhostBtn>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className={`absolute inset-4 -z-0 rounded-full ${grad} opacity-30 blur-2xl`} />
              <Art name={art.hero} alt={c.hero.title} eager grad={grad} className="relative aspect-square w-full rounded-full shadow-2xl shadow-primary/20" />
            </div>
          </div>

          {c.stats && (
            <div className="mt-8 grid grid-cols-3 gap-4 rounded-[calc(var(--radius)*1.25)] bg-primary/5 p-6">
              {c.stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-black tracking-tight sm:text-4xl" style={DISPLAY}>{s.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={DISPLAY}>{c.gallery.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.gallery.subtitle}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(art.gallery ?? []).map((g, i) => (
              <Art key={i} name={g} alt={`${c.gallery.title} ${i + 1}`} className="group aspect-[4/3] rounded-[var(--radius)] border border-border" imgClassName="transition-transform duration-700 group-hover:scale-110" />
            ))}
          </div>
        </div>

        {/* RIGHT — artists + schedule + testimonials + CTA */}
        <div className="flex flex-col gap-5">
          {c.artists && (
            <div className={`${card} p-6 sm:p-8`}>
              <h2 className="text-2xl font-black tracking-tight" style={DISPLAY}>{c.artists.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.artists.subtitle}</p>
              <div className="mt-6 grid grid-cols-5 gap-3">
                {c.artists.items.map((a, i) => (
                  <div key={a.name} className="text-center">
                    <Art name={art.artistImages?.[i]} alt={a.name} grad={grad} className="mx-auto aspect-square w-full rounded-full" />
                    <div className="mt-2 truncate text-xs font-bold" style={DISPLAY}>{a.name}</div>
                    <div className="truncate text-[9px] uppercase tracking-widest text-muted-foreground">{a.genre}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Link href="/register" className="group inline-flex items-center gap-2 rounded-[var(--radius)] border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary/40">
                  {c.artists.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className={`${card} p-6 sm:p-8`}>
            <h2 className="text-xl font-black tracking-tight" style={DISPLAY}>{c.offer.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.offer.subtitle}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {c.offer.items.map((item) => (
                <div key={item.name} className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-primary/5 p-5">
                  <div aria-hidden className={`absolute -bottom-6 -right-6 h-20 w-20 rounded-full ${grad} opacity-20 blur-xl`} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold" style={DISPLAY}>{item.name}</span>
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

          <div className={`${card} grid gap-4 p-6 sm:grid-cols-2 sm:p-8`}>
            {c.testimonials.map((r, i) => (
              <figure key={r.name} className="rounded-[var(--radius)] border border-border bg-background p-5">
                <div className="mb-3 flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, si) => <span key={si} className="text-sm">★</span>)}
                </div>
                <blockquote className="text-sm leading-relaxed">{r.quote}</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <Art name={art.avatars?.[i]} alt={r.name} grad={grad} className="h-9 w-9 shrink-0 rounded-full" />
                  <span>
                    <span className="block text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{r.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
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
