'use client';

import { useCallback, useRef, useState } from 'react';
import { LazyVideo } from '@/components/media/lazy-video';
import type { MediaEntry } from '@/lib/media';

/**
 * Before/after comparison: two clips stacked, with a draggable handle that
 * wipes between them. Works with pointer + keyboard (arrows). Pass any two
 * media entries (e.g. an "original" and a "graded" version).
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel = 'До',
  afterLabel = 'После',
}: {
  before: MediaEntry;
  after: MediaEntry;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50); // percent
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <section className="mx-auto max-w-[var(--container-max)] px-6 py-12 sm:px-10">
      <div
        ref={ref}
        className="relative select-none overflow-hidden rounded-3xl border shadow-lg"
        style={{ touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* After (full) */}
        <LazyVideo src={after.src} srcMp4={after.srcMp4} poster={after.poster} ratio={after.aspectRatio} className="w-full" />
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          {afterLabel}
        </span>

        {/* Before (revealed to the left of the handle via clip-path) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <LazyVideo src={before.src} srcMp4={before.srcMp4} poster={before.poster} ratio={before.aspectRatio} className="h-full w-full" />
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {beforeLabel}
          </span>
        </div>

        {/* Handle */}
        <div
          role="slider"
          aria-label="Сравнение до/после"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4));
            if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4));
          }}
          className="absolute inset-y-0 z-10 flex w-10 -translate-x-1/2 cursor-ew-resize items-center justify-center focus:outline-none"
          style={{ left: `${pos}%` }}
        >
          <div className="h-full w-0.5 bg-white/80 shadow" />
          <div className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/90 text-black shadow-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M9 6 3 12l6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
