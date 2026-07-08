import Link from 'next/link';
import { Check } from 'lucide-react';
import type { LayoutProps } from './_shared';
import { DISPLAY, Art, PrimaryBtn, GhostBtn, Eyebrow, BrandNav, Footer } from './_shared';

// Maison — fine dining, gold + dark. Bento grid: a left card (nav, split hero
// with a plated-dish photo, an interior gallery) and a right column (gastronomy
// showcase, tasting-menu tiers, testimonials, a dark photographic CTA).
export function MaisonLayout({ def, c, common, label }: LayoutProps) {
  const art = def.art ?? {};
  const grad = `bg-gradient-to-br ${def.cover}`;
  const card = 'rounded-[calc(var(--radius)*2)] border border-border bg-card';

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        {/* LEFT — hero + interior gallery */}
        <div className={`${card} overflow-hidden p-6 sm:p-8`}>
          <BrandNav label={label} nav={c.nav} />

          <div className="mt-8 grid items-center gap-6 sm:grid-cols-[1.1fr_1fr]">
            <div>
              <Eyebrow>{c.hero.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-balance text-4xl font-black leading-[1.06] tracking-tight sm:text-5xl" style={DISPLAY}>{c.hero.title}</h1>
              <p className="mt-4 text-muted-foreground">{c.hero.subtitle}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
                <GhostBtn>{common.ctaSecondary}</GhostBtn>
              </div>
            </div>
            <Art name={art.hero} alt={c.hero.title} eager grad={grad} className="aspect-[3/4] w-full rounded-[calc(var(--radius)*1.5)] rounded-tr-[6rem] shadow-xl" />
          </div>

          <div className="mt-10 text-center">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={DISPLAY}>{c.gallery.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.gallery.subtitle}</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(art.gallery ?? []).map((g, i) => (
              <Art key={i} name={g} alt={`${c.gallery.title} ${i + 1}`} className="group aspect-square rounded-[var(--radius)] border border-border" imgClassName="transition-transform duration-700 group-hover:scale-110" />
            ))}
          </div>
        </div>

        {/* RIGHT — showcase + menu + testimonials + CTA */}
        <div className="flex flex-col gap-5">
          <div className={`${card} p-6 sm:p-8`}>
            <div className="grid items-center gap-6 sm:grid-cols-2">
              <div>
                <h2 className="text-2xl font-black tracking-tight" style={DISPLAY}>{c.showcase.title}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{c.showcase.body}</p>
                <ul className="mt-5 space-y-3">
                  {c.showcase.points.map((p) => (
                    <li key={p} className="flex items-center gap-3">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-3 w-3" /></span>
                      <span className="text-sm">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`relative aspect-[4/3] overflow-hidden rounded-[var(--radius)] ${grad}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.3),transparent_55%)]" />
                <div className="absolute inset-x-5 bottom-5 space-y-2">
                  <div className="h-2.5 w-1/2 rounded bg-white/70" />
                  <div className="h-2.5 w-3/4 rounded bg-white/40" />
                  <div className="h-2.5 w-2/3 rounded bg-white/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Tasting menu */}
          <div className={`${card} p-6 sm:p-8`}>
            <h2 className="text-xl font-black tracking-tight" style={DISPLAY}>{c.offer.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.offer.subtitle}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {c.offer.items.map((item, i) => (
                <div key={item.name} className={`rounded-[var(--radius)] border p-5 ${i === 1 ? 'border-primary ring-1 ring-primary/40' : 'border-border'} bg-background`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold" style={DISPLAY}>{item.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.note}</span>
                  </div>
                  <p className="mt-2 text-2xl font-black tracking-tight text-primary" style={DISPLAY}>{item.price}</p>
                  <ul className="mt-3 space-y-1.5">
                    {item.features.map((ft) => (
                      <li key={ft} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary" /> {ft}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--radius)] border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary/40">
                    {common.choosePlan}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} grid gap-4 p-6 sm:grid-cols-2 sm:p-8`}>
            {c.testimonials.map((r) => (
              <figure key={r.name} className="rounded-[var(--radius)] border border-border bg-background p-5">
                <div className="mb-3 flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, si) => <span key={si} className="text-sm">★</span>)}
                </div>
                <blockquote className="text-sm leading-relaxed">{r.quote}</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${grad}`}>{r.name.charAt(0)}</span>
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
