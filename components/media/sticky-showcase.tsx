'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { LazyVideo } from '@/components/media/lazy-video';
import type { MediaEntry } from '@/lib/media';

export interface ShowcasePanel {
  title: string;
  text?: string;
  eyebrow?: string;
}

/**
 * Sticky showcase: the clip is pinned full-screen while a stack of text panels
 * scrolls through, cross-fading one into the next. Total scroll height scales
 * with the number of panels. A cinematic way to narrate a product or story.
 */
export function StickyShowcase({ entry, panels }: { entry: MediaEntry; panels: ShowcasePanel[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  return (
    <section ref={ref} className="relative" style={{ height: `${Math.max(panels.length, 1) * 100}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <LazyVideo src={entry.src} srcMp4={entry.srcMp4} poster={entry.poster} sound={entry.sound} fill />
        <div className="absolute inset-0 bg-black/55" />
        {panels.map((p, i) => (
          <Panel key={i} panel={p} index={i} total={panels.length} progress={scrollYProgress} />
        ))}
        {/* progress rail */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {panels.map((_, i) => (
            <Dot key={i} index={i} total={panels.length} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({
  panel,
  index,
  total,
  progress,
}: {
  panel: ShowcasePanel;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const span = end - start;
  const inAt = start + span * 0.15;
  const outAt = end - span * 0.15;
  const opacity = useTransform(progress, [start, inAt, outAt, end], [0, 1, 1, 0]);
  const y = useTransform(progress, [start, inAt, outAt, end], [40, 0, 0, -40]);

  return (
    <motion.div style={{ opacity }} className="absolute inset-0 flex items-center justify-center px-6">
      <motion.div style={{ y }} className="max-w-2xl text-center text-white">
        {panel.eyebrow && (
          <p className="mb-3 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">
            {panel.eyebrow}
          </p>
        )}
        <h2 className="font-display text-balance text-4xl font-black tracking-tight sm:text-6xl" style={{ textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>
          {panel.title}
        </h2>
        {panel.text && <p className="mx-auto mt-4 max-w-xl text-white/85">{panel.text}</p>}
      </motion.div>
    </motion.div>
  );
}

function Dot({ index, total, progress }: { index: number; total: number; progress: MotionValue<number> }) {
  const start = index / total;
  const end = (index + 1) / total;
  const mid = (start + end) / 2;
  const opacity = useTransform(progress, [start, mid, end], [0.35, 1, 0.35]);
  return <motion.span style={{ opacity }} className="h-1.5 w-6 rounded-full bg-white" />;
}
