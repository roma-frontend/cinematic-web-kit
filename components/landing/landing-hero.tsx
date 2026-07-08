'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowRight, Check, Play, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/fx/spotlight';
import { Magnetic } from '@/components/fx/magnetic';
import { WebglGradient } from '@/components/landing/webgl-gradient';
import { LazyVideo } from '@/components/media/lazy-video';

const EASE = [0.22, 1, 0.36, 1] as const;

export interface HeroSwatch {
  id: string;
  label: string;
  colors: string[];
}

export function LandingHero({
  badge,
  title,
  subtitle,
  primary,
  secondary,
  microItems,
  previewLabels,
  swatches,
  heroVideo,
}: {
  badge: string;
  title: string;
  subtitle: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  microItems: string[];
  previewLabels: { url: string; publish: string };
  swatches: HeroSwatch[];
  heroVideo?: { src: string; srcMp4?: string; poster?: string };
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Parallax depths for the floating mock + orbiting chips.
  const yMock = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -70]);
  const yChipA = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -140]);
  const yChipB = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 6]);

  const words = title.split(' ');
  const accentFrom = Math.max(0, words.length - 2); // last two words get the gradient

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const rise = {
    hidden: { y: reduced ? 0 : 24, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
  };

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Layered animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <WebglGradient className="absolute inset-0 h-full w-full opacity-40 dark:opacity-55" />
        <div className="b-aurora opacity-40" />
        <div className="b-pattern-grid opacity-60" />
        {/* Vertical wash: transparent at top, solid background at the bottom. */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        {/* Extra tall bottom feather so the section melts into the next one. */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklch, var(--primary) 60%, transparent), transparent)' }}
        />
      </div>
      <Spotlight size={560} strength={26} />

      <div className="mx-auto grid max-w-[var(--container-max)] items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        {/* Copy column */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={rise}>
            <span className="b-shimmer inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {badge}
            </span>
          </motion.div>

          <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,3.6rem)] font-black leading-[1.02] tracking-tight">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  variants={rise}
                  className={`inline-block ${i >= accentFrom ? 'b-gradient-text' : ''}`}
                >
                  {w}
                  {i < words.length - 1 ? '\u00a0' : ''}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p variants={rise} className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            {subtitle}
          </motion.p>

          <motion.div variants={rise} className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link href={primary.href}>
                <Button size="lg" className="b-shimmer gap-2 shadow-xl shadow-primary/25">
                  <Sparkles className="h-5 w-5" /> {primary.label}
                </Button>
              </Link>
            </Magnetic>
            <Link href={secondary.href}>
              <Button size="lg" variant="outline" className="gap-2 backdrop-blur">
                {secondary.label} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          <motion.ul variants={rise} className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {microItems.map((m) => (
              <li key={m} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> {m}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Floating glass browser mock */}
        <motion.div
          className="relative mx-auto w-full max-w-md"
          style={{ y: yMock, rotate }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        >
          <motion.div
            animate={reduced ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="b-glass overflow-hidden rounded-2xl"
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 flex items-center gap-1.5 truncate rounded-md bg-black/10 px-2 py-1 text-[11px] text-muted-foreground dark:bg-white/10">
                <Globe className="h-3 w-3" /> {previewLabels.url}
              </span>
            </div>
            {/* Mock site body */}
            <div className="space-y-4 p-5">
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl" style={{ background: 'linear-gradient(120deg, var(--primary), color-mix(in oklch, var(--primary) 45%, #a855f7))' }}>
                {heroVideo ? (
                  <LazyVideo src={heroVideo.src} srcMp4={heroVideo.srcMp4} poster={heroVideo.poster} fill className="absolute inset-0" />
                ) : (
                  <>
                    <div className="b-pattern-dots opacity-30" />
                    <span className="relative grid h-11 w-11 place-items-center rounded-full bg-white/25 backdrop-blur">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </span>
                  </>
                )}
              </div>
              <div className="h-3 w-2/3 rounded-full bg-foreground/15" />
              <div className="h-3 w-1/2 rounded-full bg-foreground/10" />
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-lg border border-border bg-card/70" />
                ))}
              </div>
              {/* Theme swatches */}
              <div className="flex items-center gap-2 pt-1">
                {swatches.slice(0, 4).map((s) => (
                  <span key={s.id} className="flex overflow-hidden rounded-full border border-border">
                    {s.colors.slice(0, 3).map((c, i) => (
                      <span key={i} className="h-4 w-4" style={{ background: c }} />
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Orbiting chips */}
          <motion.div
            style={{ y: yChipA }}
            className="absolute -left-6 top-10 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur"
          >
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI</span>
          </motion.div>
          <motion.div
            style={{ y: yChipB }}
            className="absolute -right-4 bottom-12 flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 shadow-lg backdrop-blur dark:text-emerald-400"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {previewLabels.publish}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
