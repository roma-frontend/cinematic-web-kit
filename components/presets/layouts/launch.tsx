import Link from 'next/link';
import { Check } from 'lucide-react';
import type { LayoutProps } from './_shared';
import { DISPLAY, ICONS, Art, PrimaryBtn, GhostBtn, Eyebrow, DemoBar, Footer } from './_shared';

// Launch — SaaS / product. Two-column hero with a 3D rocket, logo strip,
// feature trio, dashboard showcase, three pricing tiers, testimonials with
// avatars, and a soft gradient final CTA.
export function LaunchLayout({ def, c, common, label }: LayoutProps) {
  const art = def.art ?? {};
  const grad = `bg-gradient-to-br ${def.cover}`;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <DemoBar label={label} common={common} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60">
          <div className={`absolute right-[-10%] top-[-10%] h-[30rem] w-[30rem] rounded-full ${grad} blur-[130px] opacity-40`} />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <Eyebrow>{c.hero.eyebrow}</Eyebrow>
            <h1 className="mt-5 text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl" style={DISPLAY}>{c.hero.title}</h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">{c.hero.subtitle}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
              <GhostBtn>{common.ctaSecondary}</GhostBtn>
            </div>
          </div>
          {art.hero && (
            <div className="relative">
              <div className={`absolute inset-8 -z-10 rounded-full ${grad} opacity-30 blur-3xl`} />
              <Art name={art.hero} alt={c.hero.title} eager className="mx-auto aspect-square w-full max-w-md rounded-[calc(var(--radius)*1.5)]" imgClassName="object-contain" />
            </div>
          )}
        </div>
      </section>

      {/* Logos */}
      {c.logos && (
        <section className="mx-auto max-w-5xl px-6 pb-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {c.logos.map((l) => (
              <span key={l} className="text-lg font-bold tracking-tight text-muted-foreground" style={DISPLAY}>{l}</span>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-3">
          {c.features.map((f, i) => {
            const Icon = ICONS[def.featureIcons[i]] ?? ICONS.sparkles;
            return (
              <div key={f.title} className="rounded-[calc(var(--radius)*1.25)] border border-border bg-card p-6 shadow-sm transition-transform hover:-translate-y-1">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] text-white ${grad}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold" style={DISPLAY}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Showcase */}
      <section className="mx-auto max-w-6xl px-6 py-12">
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
          <Art name={art.showcase} alt={c.showcase.title} grad={grad} className="aspect-[4/3] rounded-[var(--radius)] border border-border shadow-lg" />
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl" style={DISPLAY}>{c.offer.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.offer.subtitle}</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {c.offer.items.map((item, i) => {
            const featured = i === 1;
            return (
              <div key={item.name} className={`rounded-[calc(var(--radius)*1.25)] border p-7 shadow-sm ${featured ? 'border-primary bg-card ring-2 ring-primary/40' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold" style={DISPLAY}>{item.name}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.note}</span>
                </div>
                <p className="mt-3 flex items-end gap-1">
                  <span className="text-3xl font-black tracking-tight" style={DISPLAY}>{item.price}</span>
                  {item.price.startsWith('$') && <span className="pb-1 text-sm text-muted-foreground">{common.perMonth}</span>}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {item.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${featured ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'border border-border bg-background hover:border-primary/40'}`}>
                  {common.choosePlan}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5 sm:grid-cols-2">
          {c.testimonials.map((r, i) => (
            <figure key={r.name} className="flex items-center gap-5 rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
              <Art name={art.avatars?.[i]} alt={r.name} grad={grad} className="h-16 w-16 shrink-0 rounded-full" />
              <div>
                <div className="mb-2 flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, si) => <span key={si} className="text-sm">★</span>)}
                </div>
                <blockquote className="text-sm leading-relaxed">{r.quote}</blockquote>
                <figcaption className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{r.name}</span> · {r.role}</figcaption>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8">
        <div className="relative overflow-hidden rounded-[calc(var(--radius)*1.5)] border border-border bg-card p-10 text-center sm:p-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className={`absolute left-1/2 top-1/2 h-72 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full ${grad} opacity-20 blur-[120px]`} />
          </div>
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl" style={DISPLAY}>{c.final.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{c.final.subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryBtn>{common.ctaPrimary}</PrimaryBtn>
            <GhostBtn>{common.allPresets}</GhostBtn>
          </div>
        </div>
      </section>

      <Footer label={label} common={common} />
    </main>
  );
}
