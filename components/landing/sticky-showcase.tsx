'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { Wand2, LayoutTemplate, Rocket } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;
const ACCENTS = ['var(--primary)', '#8b5cf6', '#ec4899', '#06b6d4'];
const ICONS = [Wand2, LayoutTemplate, Rocket];

export interface ShowcaseStep {
  n: string;
  title: string;
  text: string;
}

/** Per-step preview screenshots (light + dark scheme), served from R2. */
export interface ShowcaseShot {
  light: string;
  dark: string;
}

/**
 * Sticky "scroll story": a pinned device mock on the left whose frame swaps as
 * the reader scrolls through the steps on the right (studio-grade). Falls back
 * to a plain stacked list on small screens and under reduced-motion.
 */
export function StickyShowcase({
  title,
  subtitle,
  steps,
  shots = [],
}: {
  title: string;
  subtitle: string;
  steps: ShowcaseStep[];
  shots?: ShowcaseShot[];
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)));
    setActive(idx);
  });

  const accent = ACCENTS[active % ACCENTS.length];

  return (
    <section id="how" className="scroll-mt-24">
      <div className="mx-auto max-w-[var(--container-max)] px-6 pt-16 text-center sm:px-10">
        <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{subtitle}</p>
      </div>

      {/* Pinned experience (desktop) */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${steps.length * 82}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-[var(--container-max)] grid-cols-2 items-center gap-12 px-10">
            {/* Pinned visual */}
            <div className="relative h-[420px]">
              {steps.map((s, i) => {
                const Icon = ICONS[i % ICONS.length];
                const on = i === active;
                const shot = shots[i];
                return (
                  <motion.div
                    key={i}
                    className="absolute inset-0"
                    initial={false}
                    animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.92, y: on ? 0 : 30 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    style={{ pointerEvents: on ? 'auto' : 'none' }}
                  >
                    <div className="b-glass flex h-full flex-col overflow-hidden rounded-3xl">
                      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                        <span className="h-3 w-3 rounded-full bg-red-400/80" />
                        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                        <span
                          className="ml-2 font-display text-xs font-bold tracking-widest"
                          style={{ color: accent }}
                        >
                          {s.n}
                        </span>
                      </div>
                      {shot ? (
                        <div className="relative flex-1 overflow-hidden">
                          {/* Real product screenshot (R2), scheme-aware swap. */}
                          <Image
                            src={shot.dark}
                            alt={s.title}
                            fill
                            sizes="(min-width: 1280px) 574px, (min-width: 1024px) 45vw, 100vw"
                            className="hidden object-cover object-top dark:block"
                          />
                          <Image
                            src={shot.light}
                            alt={s.title}
                            fill
                            sizes="(min-width: 1280px) 574px, (min-width: 1024px) 45vw, 100vw"
                            className="block object-cover object-top dark:hidden"
                          />
                        </div>
                      ) : (
                        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 p-8">
                          <div className="b-pattern-dots opacity-30" />
                          <span
                            className="relative grid h-20 w-20 place-items-center rounded-2xl text-white shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${accent}, color-mix(in oklch, ${accent} 50%, #a855f7))` }}
                          >
                            <Icon className="h-9 w-9" />
                          </span>
                          <span className="relative font-display text-7xl font-black" style={{ color: accent, opacity: 0.9 }}>
                            {s.n}
                          </span>
                          <div className="relative flex w-full max-w-xs flex-col gap-2">
                            <div className="h-3 rounded-full bg-foreground/15" />
                            <div className="h-3 w-2/3 rounded-full bg-foreground/10" />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Steps list */}
            <div className="flex flex-col gap-6">
              {steps.map((s, i) => {
                const on = i === active;
                return (
                  <button
                    key={i}
                    onClick={() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="group relative flex gap-4 text-left"
                    style={{ opacity: on ? 1 : 0.85, transition: 'opacity 0.4s ease' }}
                  >
                    <span
                      className="mt-1 h-full w-1 shrink-0 rounded-full transition-colors"
                      style={{ background: on ? accent : 'var(--border)' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xl font-black" style={{ color: on ? accent : undefined }}>{s.n}</span>
                        <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                      </div>
                      <p className="mt-1.5 text-muted-foreground">{s.text}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stacked fallback (mobile / reduced-motion friendly) */}
      <div className="mx-auto grid max-w-[var(--container-max)] gap-6 px-6 py-12 sm:px-10 lg:hidden">
        {steps.map((s, i) => {
          const Icon = ICONS[i % ICONS.length];
          const shot = shots[i];
          return (
            <motion.div
              key={i}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: EASE }}
              className="overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur"
            >
              {shot && (
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border">
                  <Image src={shot.dark} alt={s.title} fill sizes="100vw" className="hidden object-cover object-top dark:block" />
                  <Image src={shot.light} alt={s.title} fill sizes="100vw" className="block object-cover object-top dark:hidden" />
                </div>
              )}
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-3xl font-black text-muted-foreground/20">{s.n}</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
