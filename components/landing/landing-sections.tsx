'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useInView,
  useMotionValue,
  animate,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { Plus } from 'lucide-react';
import { Tilt } from '@/components/fx/tilt';
import { Marquee } from '@/components/fx/marquee';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Top scroll-progress bar tinted with the theme primary. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left"
    >
      <div className="h-full w-full" style={{ background: 'linear-gradient(90deg, var(--primary), color-mix(in oklch, var(--primary) 50%, #a855f7))' }} />
    </motion.div>
  );
}

/** Fade + rise into view. */
export function MotionReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Animated count-up (parses a leading number, preserves any suffix like +/%). */
function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();
  const match = value.match(/^([\d.]+)(.*)$/);
  const target = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : value;
  const [display, setDisplay] = useState(match && !reduced ? '0' : (match ? match[1] : value));
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!inView || !match || reduced) return;
    const controls = animate(mv, target, {
      duration: 1.4,
      ease: EASE,
      onUpdate: (v) => setDisplay(Number.isInteger(target) ? String(Math.round(v)) : v.toFixed(0)),
    });
    return () => controls.stop();
  }, [inView, match, reduced, target, mv]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/** Marquee band of benefit words. */
export function MarqueeBand({ words, label }: { words: string[]; label: string }) {
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden py-10">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="relative">
        {/* Soft edge fades so the loop dissolves into the background, no hard seams. */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent sm:w-40" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent sm:w-40" />
        <Marquee
          items={words.map((w, i) => (
            <span
              key={w}
              className="[--grad:linear-gradient(90deg,var(--foreground),color-mix(in_oklch,var(--primary)_60%,var(--foreground)),var(--foreground))] bg-[image:var(--grad)] bg-clip-text text-transparent [background-size:200%_100%]"
              style={!reduced ? ({ backgroundPosition: `${(i % 5) * 10}% 0` } as React.CSSProperties) : undefined}
            >
              {w}
            </span>
          ))}
          disabled={reduced ?? undefined}
        />
      </div>
    </section>
  );
}

/** Live stats with count-up. */
export function StatsBand({ title, subtitle, items }: { title: string; subtitle: string; items: { value: string; label: string }[] }) {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  // Micro type reaction: slight tracking change on scroll to add life, disabled on PRM
  const track = useSpring(useTransform(scrollYProgress, [0, 1], [0, 0.6]), { stiffness: 100, damping: 30 });
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.96]);
  return (
    <section className="cv-section mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
      <MotionReveal className="mb-10 text-center">
        <motion.h2 style={reduced ? undefined : { letterSpacing: track, opacity }} className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</motion.h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
      </MotionReveal>
      <div className="relative">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((s, i) => (
            <MotionReveal key={s.label} delay={i * 0.08}>
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 text-center backdrop-blur transition-transform duration-300 will-change-transform hover:-translate-y-0.5">
              <div className="relative font-display text-4xl font-black sm:text-5xl text-foreground">
                <span className="relative inline-block">
                  <Counter value={s.value} />
                </span>
              </div>
              <p className="relative mt-2 text-sm text-muted-foreground">{s.label}</p>
            </div>
          </MotionReveal>
        ))}
        </div>
      </div>
    </section>
  );
}

/** Bento features grid — asymmetric, glass + tilt + gradient accents. */
export function BentoFeatures({
  title,
  subtitle,
  items,
  icons,
}: {
  title: string;
  subtitle: string;
  items: { title: string; text: string }[];
  icons: ReactNode[];
}) {
  // Spans give the grid a designed, asymmetric rhythm on large screens.
  const spans = ['lg:col-span-2 lg:row-span-2', '', '', '', 'lg:col-span-2', ''];
  const tags = [
    '01 // VISUAL_CONSTRUCTOR',
    '02 // CINEMATIC_MEDIA',
    '03 // MOTION_ENGINE',
    '04 // THEME_BRANDING',
    '05 // SEO_DOMAIN',
    '06 // PORTAL_CABINETS',
  ];
  return (
    <section id="features" className="cv-section mx-auto max-w-[var(--container-max)] scroll-mt-24 px-6 py-16 sm:px-10 sm:py-20 relative overflow-hidden lg:overflow-visible">
      {/* Blueprint background coordinate indicators */}
      <div aria-hidden className="pointer-events-none absolute -left-2 top-4 hidden lg:flex items-center gap-1.5 b-tech-tag select-none text-[8px] opacity-40">
        <span>LOC: [45.10, -12.30]</span>
        <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
      </div>
      <div aria-hidden className="pointer-events-none absolute -right-2 top-4 hidden lg:flex items-center gap-1.5 b-tech-tag select-none text-[8px] opacity-40">
        <span>REF: B-STUDIO_v0.1</span>
      </div>

      {/* Decorative layout grids (Blueprint style) */}
      <div aria-hidden className="absolute -left-6 top-16 b-tech-plus hidden lg:flex">+</div>
      <div aria-hidden className="absolute -right-6 top-16 b-tech-plus hidden lg:flex">+</div>
      <div aria-hidden className="absolute -left-6 bottom-16 b-tech-plus hidden lg:flex">+</div>
      <div aria-hidden className="absolute -right-6 bottom-16 b-tech-plus hidden lg:flex">+</div>

      <div aria-hidden className="absolute -left-6 top-16 right-0 b-tech-line-h hidden lg:block" />
      <div aria-hidden className="absolute -left-6 bottom-16 right-0 b-tech-line-h hidden lg:block" />

      <MotionReveal className="mb-12 text-center relative z-10">
        <motion.h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl" initial={false} whileInView={useReducedMotion() ? undefined : { letterSpacing: [0, 0.4, 0], opacity: [1, 0.98, 1] }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1.2, ease: EASE }}>{title}</motion.h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
      </MotionReveal>
      <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-10">
        {items.map((f, i) => (
          <MotionReveal key={f.title} delay={(i % 3) * 0.08} className={spans[i] ?? ''}>
            <Tilt className="h-full">
              <div className="group b-border-beam relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/50 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle, var(--primary), transparent 65%)' }}
                />
                
                {/* Monospace tech tag on top right */}
                <div className="relative mb-4 flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
                    {icons[i]}
                  </span>
                  <span className="b-tech-tag font-mono text-[9px] tracking-widest text-muted-foreground/60">{tags[i]}</span>
                </div>

                <h3 className={`relative font-bold tracking-tight ${i === 0 ? 'text-2xl' : 'text-lg'}`}>{f.title}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </Tilt>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}

/** Testimonials as two opposing marquee rows of glass cards. */
export function Testimonials({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: { quote: string; name: string; role: string }[];
}) {
  const mid = Math.ceil(items.length / 2);
  const rowItems = (list: typeof items) =>
    list.map((t, i) => (
      <div key={i} className="mr-4 w-[320px] shrink-0 whitespace-normal rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
        <p className="text-sm leading-relaxed text-foreground/90">“{t.quote}”</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/50 text-sm font-bold text-primary-foreground">
            {t.name.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.role}</p>
          </div>
        </div>
      </div>
    ));
  const row = (list: typeof items, reverse?: boolean) => (
    <div className="group relative flex overflow-hidden" style={reverse ? ({ ['--marquee-dir' as string]: 'reverse' } as React.CSSProperties) : undefined}>
      <div className="marquee-row flex shrink-0">{rowItems(list)}</div>
      <div className="marquee-row flex shrink-0" aria-hidden>{rowItems(list)}</div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent sm:w-40" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent sm:w-40" />
    </div>
  );
  return (
    <section className="cv-section mx-auto max-w-[var(--container-max)] overflow-hidden px-0 py-16 sm:py-20">
      <MotionReveal className="mb-10 px-6 text-center sm:px-10">
        <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
      </MotionReveal>
      <div className="space-y-4">
        {row(items.slice(0, mid))}
        {row(items.slice(mid), true)}
      </div>
    </section>
  );
}

/** FAQ accordion. */
export function Faq({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="cv-section mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
      <MotionReveal className="mb-10 text-center">
        <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
      </MotionReveal>
      <div className="space-y-3">
        {items.map((f, i) => {
          const isOpen = open === i;
          return (
            <MotionReveal key={f.q} delay={i * 0.05}>
              <div className="overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="font-semibold">{f.q}</span>
                  <Plus aria-hidden className={`h-5 w-5 shrink-0 text-primary transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
                </button>
                <div id={`faq-answer-${i}`} className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </div>
                </div>
              </div>
            </MotionReveal>
          );
        })}
      </div>
    </section>
  );
}
