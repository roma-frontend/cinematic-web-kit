'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, ArrowRight, Check, Play, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/fx/spotlight';
import { Magnetic } from '@/components/fx/magnetic';
import { WebglGradient } from '@/components/landing/webgl-gradient';
import { LazyVideo } from '@/components/media/lazy-video';

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
  commandPrompt,
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
  commandPrompt?: string;
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

  const [activeThemeId, setActiveThemeId] = useState(swatches[0]?.id || '');
  const activeSwatch = swatches.find((s) => s.id === activeThemeId) || swatches[0];
  const activeColors = activeSwatch?.colors || ['var(--primary)', 'var(--primary)', 'var(--muted)'];

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent || ''));
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const kbdText = isMac ? '⌘K' : 'Ctrl+K';
  const displayPrompt = commandPrompt ? commandPrompt.replace('{key}', kbdText) : '';

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Layered animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <WebglGradient className="absolute inset-0 h-full w-full opacity-40 dark:opacity-55" />
        <div className="b-aurora opacity-35" />
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
      <Spotlight size={640} strength={28} />

      <div className="mx-auto grid max-w-[var(--container-max)] items-center gap-12 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        {/* Copy column — CSS entrance (painted + animated on first frame, no
            hydration wait, so there's no flash of the empty themed background). */}
        <div>
          <div className="hero-rise" style={{ animationDelay: '0ms' }}>
            <span className="b-shimmer inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {badge}
            </span>
          </div>

          <h1 className="hero-rise mt-6 font-display text-[clamp(2.6rem,6vw,3.6rem)] font-black leading-[1.02] tracking-tight" style={{ animationDelay: '80ms' }}>
            {words.map((w, i) => (
              <span key={i} className={`inline-block ${i >= accentFrom ? 'b-gradient-text' : ''}`}>
                {w}
                {i < words.length - 1 ? '\u00a0' : ''}
              </span>
            ))}
          </h1>

          <p className="hero-rise mt-6 max-w-xl text-pretty text-lg text-muted-foreground" style={{ animationDelay: '160ms' }}>
            {subtitle}
          </p>

          <div className="hero-rise mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center" style={{ animationDelay: '240ms' }}>
            <div className="w-full sm:w-auto">
              <Magnetic>
                <Button asChild size="lg" className="group relative w-full gap-2 overflow-hidden shadow-xl shadow-primary/25 sm:w-auto">
                  <Link href={primary.href}>
                    <span aria-hidden className="btn-neon-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <Sparkles className="h-5 w-5" /> {primary.label}
                  </Link>
                </Button>
              </Magnetic>
            </div>
            <Button asChild size="lg" variant="outline" className="w-full gap-2 backdrop-blur sm:w-auto">
              <Link href={secondary.href}>
                {secondary.label} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {displayPrompt && (
            <div className="hero-rise mt-6" style={{ animationDelay: '280ms' }}>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('cwk:open-palette'))}
                className="group/cmd inline-flex items-center gap-2 rounded-full border border-border bg-card/45 px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:bg-card/85 hover:text-foreground cursor-pointer shadow-sm hover:shadow-md backdrop-blur-sm"
              >
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 group-hover/cmd:bg-primary transition-colors animate-pulse" />
                <span className="font-medium">{displayPrompt}</span>
              </button>
            </div>
          )}

          <ul className="hero-rise mt-7 grid gap-2 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:gap-x-6" style={{ animationDelay: '320ms' }}>
            {microItems.map((m) => (
              <li key={m} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-primary" /> {m}
              </li>
            ))}
          </ul>
        </div>

        {/* Floating glass browser mock — CSS entrance on an outer wrapper; the
            inner layer keeps the framer-motion scroll parallax. */}
        <div className="hero-pop relative mx-auto w-full max-w-md">
          <motion.div className="relative" style={{ y: yMock, rotate }}>
          <motion.div
            animate={reduced ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="b-glass theme-preview-root overflow-hidden rounded-2xl"
            style={{
              '--preview-primary-light': activeColors[0],
              '--preview-primary-dark': activeColors[1],
              '--preview-muted': activeColors[2],
            } as React.CSSProperties}
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
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-xl transition-all duration-500" style={{ background: 'linear-gradient(120deg, var(--preview-primary, var(--primary)), color-mix(in oklch, var(--preview-primary, var(--primary)) 45%, #a855f7))' }}>
                {heroVideo ? (
                  <LazyVideo src={heroVideo.src} srcMp4={heroVideo.srcMp4} poster={heroVideo.poster} fill priority className="absolute inset-0" />
                ) : (
                  <>
                    <div className="b-pattern-dots opacity-30" />
                    <span className="relative grid h-11 w-11 place-items-center rounded-full bg-white/25 backdrop-blur">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </span>
                  </>
                )}
              </div>
              <div className="h-3 w-2/3 rounded-full bg-foreground/15 transition-all duration-300" style={{ backgroundColor: 'color-mix(in oklch, var(--preview-primary, var(--primary)) 20%, var(--foreground) 10%)' }} />
              <div className="h-3 w-1/2 rounded-full bg-foreground/10" />
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-lg border transition-all duration-300"
                    style={i === 0 ? {
                      borderColor: 'color-mix(in oklch, var(--preview-primary, var(--primary)) 30%, transparent)',
                      backgroundColor: 'color-mix(in oklch, var(--preview-primary, var(--primary)) 10%, transparent)',
                    } : {
                      borderColor: 'var(--border)',
                      backgroundColor: 'color-mix(in oklch, var(--card) 70%, transparent)',
                    }}
                  />
                ))}
              </div>
              {/* Theme swatches */}
              <div className="flex items-center gap-2 pt-1">
                {swatches.slice(0, 4).map((s) => {
                  const isActive = s.id === activeThemeId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveThemeId(s.id)}
                      aria-label={`Сменить тему на ${s.label}`}
                      className={`group/swatch flex overflow-hidden rounded-full border cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'border-primary scale-110 shadow-md ring-2 ring-primary/20'
                          : 'border-border hover:scale-105 hover:border-foreground/30'
                      }`}
                    >
                      {s.colors.slice(0, 3).map((c, i) => (
                        <span key={i} className="h-4 w-4 shrink-0" style={{ background: c }} />
                      ))}
                    </button>
                  );
                })}
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
      </div>
    </section>
  );
}
