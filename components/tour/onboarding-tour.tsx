'use client';

// The tour engine: a spotlight overlay (four dimming panels leaving the target
// interactive), a glowing ring, an animated "click here" arrow and a floating
// tooltip that flips to stay on-screen. Framer-motion drives every transition;
// it respects prefers-reduced-motion and plays synthesized step sounds. Pure
// presentation — persistence + auto-start live in tour-launcher.tsx.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import type { TourStep, Placement } from '@/lib/tour/types';
import type { TourChrome } from '@/lib/tour/tours';
import { AnimatedArrow } from '@/components/tour/animated-arrow';
import { playStep, playBack, playWelcome, playFinish } from '@/components/tour/tour-sound';

const TIP_W = 340;
const SPACING = 56; // target → tooltip gap; leaves room for the "click here" arrow
const PAD = 8; // spotlight padding around the target

type Rect = { left: number; top: number; width: number; height: number };

export function OnboardingTour({ steps, chrome, soundOn, onToggleSound, reduced, onComplete, onSkip }: {
  steps: TourStep[];
  chrome: TourChrome;
  soundOn: boolean;
  onToggleSound: () => void;
  reduced: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0, place: 'center' as Placement });
  const [ready, setReady] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const step = steps[i];
  const total = steps.length;

  const place = useCallback((r: Rect | null, pref: Placement) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const th = tipRef.current?.offsetHeight ?? 190;
    const tw = tipRef.current?.offsetWidth ?? TIP_W;
    if (!r || pref === 'center') {
      setPos({ x: (vw - tw) / 2, y: (vh - th) / 2, place: 'center' });
      return;
    }
    let p: Placement = pref;
    const fits: Record<Placement, boolean> = {
      top: r.top - th - SPACING > 8,
      bottom: r.top + r.height + th + SPACING < vh - 8,
      left: r.left - tw - SPACING > 8,
      right: r.left + r.width + tw + SPACING < vw - 8,
      center: true,
    };
    if (!fits[p]) {
      const alt = (['bottom', 'top', 'right', 'left'] as const).find((c) => fits[c]);
      if (alt) p = alt;
    }
    let x = 0, y = 0;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (p === 'top') { x = cx - tw / 2; y = r.top - th - SPACING; }
    else if (p === 'bottom') { x = cx - tw / 2; y = r.top + r.height + SPACING; }
    else if (p === 'left') { x = r.left - tw - SPACING; y = cy - th / 2; }
    else { x = r.left + r.width + SPACING; y = cy - th / 2; }
    x = Math.max(12, Math.min(x, vw - tw - 12));
    y = Math.max(12, Math.min(y, vh - th - 12));
    setPos({ x, y, place: p });
  }, []);

  // Measure the current target (no scrolling) and position the tooltip.
  const align = useCallback(() => {
    if (!step?.target) { setRect(null); place(null, 'center'); return; }
    const el = document.querySelector(step.target);
    const b = el?.getBoundingClientRect();
    if (!el || !b || b.width < 2 || b.height < 2) { setRect(null); place(null, 'center'); return; }
    const rr = { left: b.left, top: b.top, width: b.width, height: b.height };
    setRect(rr);
    place(rr, step.placement ?? 'bottom');
  }, [step, place]);

  // On each step: run its side-effect (e.g. switch a tab), wait for the target
  // to actually appear (tab content re-renders), scroll it into view so the
  // page visibly moves to the spot, then align the spotlight.
  useLayoutEffect(() => {
    setReady(false);
    step?.onEnter?.();
    let raf = 0;
    const reveal = (attempt: number) => {
      if (!step) return;
      if (!step.target) { setRect(null); place(null, 'center'); setReady(true); return; }
      const el = document.querySelector(step.target) as HTMLElement | null;
      const b = el?.getBoundingClientRect();
      if (!el || !b || b.width < 2 || b.height < 2) {
        if (attempt < 30) { raf = requestAnimationFrame(() => reveal(attempt + 1)); return; }
        setRect(null); place(null, 'center'); setReady(true); return;
      }
      const need = 170;
      const off = b.top < need || b.bottom > window.innerHeight - need || b.left < 8 || b.right > window.innerWidth - 8;
      if (off) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      align();
      setReady(true);
    };
    raf = requestAnimationFrame(() => reveal(0));
    return () => cancelAnimationFrame(raf);
  }, [i, step, place, align]);

  // Keep the spotlight glued to the target during scroll/resize (incl. the
  // smooth scroll above).
  useEffect(() => {
    const on = () => align();
    window.addEventListener('resize', on);
    window.addEventListener('scroll', on, true);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true); };
  }, [align]);

  // Reposition once the tooltip has its real measured size. align() reads the
  // measured layout and updates position state — a legitimate useLayoutEffect
  // measure-then-position pattern, so set-state-in-effect is disabled here.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready) align();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, i]);

  const finish = useCallback(() => { if (soundOn) playFinish(); onComplete(); }, [soundOn, onComplete]);
  const next = useCallback(() => {
    if (i < total - 1) { if (soundOn) playStep(); setI(i + 1); }
    else finish();
  }, [i, total, soundOn, finish]);
  const prev = useCallback(() => { if (i > 0) { if (soundOn) playBack(); setI(i - 1); } }, [i, soundOn]);

  // Welcome chime on the opening step (fires once audio is unlocked).
  useEffect(() => {
    if (i === 0 && soundOn) playWelcome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onSkip]);

  if (!step) return null;
  const showRing = !!rect && step.highlight !== false;
  const showArrow = showRing && pos.place !== 'center' && (step.pointer || step.highlight !== false);
  const progress = ((i + 1) / total) * 100;
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 300, damping: 30 };
  const dim = 'rgba(3, 6, 20, 0.60)';
  const RAD = 14;

  return (
    <AnimatePresence>
      <motion.div key="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999]">
        {/* Spotlight: a single element whose huge box-shadow dims everything
            OUTSIDE its rounded hole — no seams, perfectly rounded corners. The
            hole itself is pointer-transparent so the target stays clickable. */}
        {showRing && rect ? (
          <motion.div
            initial={false}
            animate={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
            transition={spring}
            className="pointer-events-none"
            style={{
              position: 'fixed',
              borderRadius: RAD,
              boxShadow: `0 0 0 9999px ${dim}, 0 0 0 2px var(--primary), 0 0 0 7px color-mix(in oklch, var(--primary) 22%, transparent), 0 12px 48px color-mix(in oklch, var(--primary) 38%, transparent)`,
            }}
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0" style={{ background: dim }} />
        )}

        {/* Pulsing "click here" arrow */}
        {showArrow && rect && (
          <AnimatedArrow rect={rect} side={pos.place as 'top' | 'bottom' | 'left' | 'right'} label={step.pointer ? chrome.clickHere : undefined} reduced={reduced} />
        )}

        {/* Tooltip card — one element that GLIDES to each step's position. */}
        <motion.div
          ref={tipRef}
          initial={false}
          animate={{ left: pos.x, top: pos.y, opacity: ready ? 1 : 0 }}
          transition={spring}
          className="fixed z-[10002] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ width: TIP_W, maxWidth: 'calc(100vw - 24px)' }}
        >
          <div className="h-1 w-full bg-muted">
            <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
          <div className="p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <AnimatePresence mode="wait">
                <motion.h3
                  key={`t-${i}`}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="text-base font-bold leading-tight tracking-tight"
                >
                  {step.title}
                </motion.h3>
              </AnimatePresence>
              <div className="flex flex-none items-center gap-1">
                <button onClick={onToggleSound} title={soundOn ? chrome.soundOff : chrome.soundOn} aria-label={soundOn ? chrome.soundOff : chrome.soundOn} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button onClick={onSkip} title={chrome.skip} aria-label={chrome.skip} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={`b-${i}`}
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mb-4 text-sm leading-relaxed text-muted-foreground"
              >
                {step.body}
              </motion.p>
            </AnimatePresence>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <span key={idx} className="h-1.5 rounded-full transition-all duration-300" style={{ width: idx === i ? 18 : 6, background: idx === i ? 'var(--primary)' : 'var(--muted-foreground)', opacity: idx === i ? 1 : 0.35 }} />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {i > 0 && (
                  <button onClick={prev} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" /> {chrome.back}
                  </button>
                )}
                <motion.button
                  onClick={next}
                  whileHover={reduced ? undefined : { scale: 1.04 }}
                  whileTap={reduced ? undefined : { scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  {i === total - 1 ? (<><CheckCircle2 className="h-3.5 w-3.5" /> {chrome.done}</>) : (<>{chrome.next} <ArrowRight className="h-3.5 w-3.5" /></>)}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
