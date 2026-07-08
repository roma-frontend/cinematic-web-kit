import { Check } from 'lucide-react';
import type { LayoutProps } from './_shared';
import { DISPLAY, Art, PrimaryBtn, GhostBtn, Eyebrow, BrandNav, Footer } from './_shared';

// Studio — design agency. Bento grid: a large left card (hero with a 3D
// collage, client logos, a labelled works grid) and a right column of stacked
// cards (process showcase, testimonials, a solid-color 3D CTA).
export function StudioLayout({ def, c, common, label }: LayoutProps) {
  const art = def.art ?? {};
  const grad = `bg-gradient-to-br ${def.cover}`;
  const card = 'rounded-[calc(var(--radius)*2)] border border-border bg-card';

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* LEFT — hero + logos + works */}
        <div className={`${card} overflow-hidden p-6 sm:p-8`}>
          <BrandNav label={label} nav={c.nav} />

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
              <div aria-hidden className={`absolute inset-6 -z-0 rounded-full ${grad} opacity-25 blur-2xl`} />
              <Art name={art.hero} alt={c.hero.title} eager grad={grad} className="relative aspect-square w-full rounded-[calc(var(--radius)*1.5)]" imgClassName="object-contain" />
            </div>
          </div>

          {c.logos && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-5">
              {c.logos.map((l) => (
                <span key={l} className="text-base font-bold tracking-tight text-muted-foreground" style={DISPLAY}>{l}</span>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl" style={DISPLAY}>{c.gallery.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.gallery.subtitle}</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(art.gallery ?? []).map((g, i) => (
              <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius)] border border-border">
                <Art name={g} alt={c.galleryLabels?.[i] ?? `${c.gallery.title} ${i + 1}`} className="h-full w-full" imgClassName="transition-transform duration-700 group-hover:scale-110" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {c.galleryLabels?.[i] && (
                  <span className="absolute bottom-3 left-3 text-xs font-semibold text-white">{c.galleryLabels[i]}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — showcase + testimonials + CTA */}
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
              <Art name={art.showcase} alt={c.showcase.title} grad={grad} className="aspect-square w-full rounded-[var(--radius)]" imgClassName="object-contain" />
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

          <div className="relative mt-auto overflow-hidden rounded-[calc(var(--radius)*2)] bg-primary p-8 text-primary-foreground">
            {art.cta && (
              <Art name={art.cta} alt="" className="pointer-events-none absolute -right-6 bottom-0 top-0 z-0 w-1/2 opacity-90" imgClassName="object-contain" />
            )}
            <div className="relative z-10 max-w-[60%]">
              <h2 className="text-balance text-3xl font-black tracking-tight" style={DISPLAY}>{c.final.title}</h2>
              <p className="mt-3 text-sm opacity-90">{c.final.subtitle}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <PrimaryBtn className="bg-white !text-primary shadow-none hover:bg-white">{common.ctaPrimary}</PrimaryBtn>
                <GhostBtn dark>{common.allPresets}</GhostBtn>
              </div>
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
