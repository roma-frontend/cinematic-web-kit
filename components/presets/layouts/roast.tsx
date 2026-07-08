import Link from 'next/link';
import { Check } from 'lucide-react';
import type { LayoutProps } from './_shared';
import { DISPLAY, Art, PrimaryBtn, GhostBtn, Eyebrow, DemoBar, Footer } from './_shared';

// Roast — editorial coffee. Split hero with a latte photo, "bean to cup"
// showcase, an atmosphere photo gallery, a menu, tinted testimonials and a
// dark photographic final CTA.
export function RoastLayout({ def, c, common, label }: LayoutProps) {
  const art = def.art ?? {};
  const grad = `bg-gradient-to-br ${def.cover}`;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <DemoBar label={label} common={common} />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <Eyebrow>{c.hero.eyebrow}</Eyebrow>
          <h1 className="mt-5 text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl" style={DISPLAY}>{c.hero.title}</h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">{c.hero.subtitle}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
            <GhostBtn>{common.ctaSecondary}</GhostBtn>
          </div>
        </div>
        <Art name={art.hero} alt={c.hero.title} eager grad={grad} className="aspect-square w-full rounded-[calc(var(--radius)*2)] border border-border shadow-2xl shadow-primary/10" />
      </section>

      {/* Showcase — bean to cup */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid items-center gap-10 rounded-[calc(var(--radius)*1.5)] border border-border bg-card p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-black tracking-tight" style={DISPLAY}>{c.showcase.title}</h2>
            <p className="mt-4 text-muted-foreground">{c.showcase.body}</p>
            <ul className="mt-6 space-y-3">
              {c.showcase.points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-3 w-3" /></span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`relative aspect-[4/3] overflow-hidden rounded-[var(--radius)] ${grad}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.35),transparent_50%)]" />
            <div className="absolute inset-x-6 bottom-6 space-y-2">
              <div className="h-3 w-1/2 rounded bg-white/70" />
              <div className="h-3 w-3/4 rounded bg-white/40" />
              <div className="h-3 w-2/3 rounded bg-white/30" />
            </div>
          </div>
        </div>
      </section>

      {/* Gallery — atmosphere */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={DISPLAY}>{c.gallery.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.gallery.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(art.gallery ?? []).map((g, i) => (
            <Art key={i} name={g} alt={`${c.gallery.title} ${i + 1}`} className="group aspect-[4/3] rounded-[var(--radius)] border border-border" imgClassName="transition-transform duration-700 group-hover:scale-110" />
          ))}
        </div>
      </section>

      {/* Menu */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={DISPLAY}>{c.offer.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.offer.subtitle}</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {c.offer.items.map((item) => (
            <div key={item.name} className="rounded-[calc(var(--radius)*1.25)] border border-border bg-card p-7 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold" style={DISPLAY}>{item.name}</h3>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.note}</span>
              </div>
              <p className="mt-3 text-3xl font-black tracking-tight" style={DISPLAY}>{item.price}</p>
              <ul className="mt-5 space-y-2.5">
                {item.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius)] border border-border bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary/40">
                {common.choosePlan}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-5 sm:grid-cols-2">
          {c.testimonials.map((r) => (
            <figure key={r.name} className="rounded-[var(--radius)] border border-primary/20 bg-primary/5 p-6">
              <div className="mb-3 flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => <span key={i} className="text-sm">★</span>)}
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
      </section>

      {/* Final CTA — dark photographic */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <div className="relative isolate overflow-hidden rounded-[calc(var(--radius)*1.5)] p-10 text-center text-white sm:p-16">
          <Art name={art.cta} alt="" grad={grad} className="absolute inset-0 -z-10 h-full w-full" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/60 to-black/40" />
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl" style={DISPLAY}>{c.final.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">{c.final.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
            <GhostBtn dark>{common.allPresets}</GhostBtn>
          </div>
        </div>
      </section>

      <Footer label={label} common={common} />
    </main>
  );
}
