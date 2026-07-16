'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';
import { useLocale } from '@/hooks/use-locale';
import { ui } from '@/lib/ui-dict';

/** Convert an "16:9" aspect string to a CSS aspect-ratio value. */
function toAspect(ratio?: string) {
  return (ratio || '16:9').replace(':', ' / ');
}

/**
 * A looping background video that only mounts once it scrolls near the viewport
 * (IntersectionObserver), so a page full of clips doesn't fetch/decode them all
 * up front. The poster image paints instantly and acts as the LCP-friendly
 * placeholder until the muted, autoplaying loop takes over.
 *
 * When `sound` is set, a floating toggle lets the viewer un-mute; volume is
 * ramped in/out with a short fade so it never pops.
 *
 * Viewers with `prefers-reduced-motion` never get an autoplaying loop: the
 * poster stays put with an explicit play button, and the video only mounts
 * once they opt in.
 */
export function LazyVideo({
  src,
  srcMp4,
  poster,
  ratio,
  className,
  sound = false,
  fill = false,
  priority = false,
}: {
  src: string;
  srcMp4?: string;
  poster?: string;
  ratio?: string;
  className?: string;
  sound?: boolean;
  fill?: boolean;
  /** Above-the-fold clip (hero): its poster is the LCP — fetch it eagerly at high priority. */
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(!priority);
  const a11y = ui(useLocale().locale).a11y;
  // Keep the above-the-fold hero poster as the LCP element before mounting the
  // video. Deferring decode until after the first paint avoids LCP render delay.
  useEffect(() => {
    if (!priority) return;
    const timer = window.setTimeout(() => setHeroVideoReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [priority]);
  const showVideo = heroVideoReady && visible && (!reducedMotion || motionOptIn);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Ramp the volume toward a target over ~400ms instead of snapping.
  const fadeTo = useCallback((target: number) => {
    const v = videoRef.current;
    if (!v) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (target > 0) {
      v.muted = false;
      if (v.volume === 1) v.volume = 0; // start from silence when un-muting
    }
    const start = performance.now();
    const from = v.volume;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 400);
      v.volume = from + (target - from) * t;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else if (target === 0) {
        v.muted = true;
        v.volume = 1; // reset for next un-mute
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const toggleSound = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      fadeTo(next ? 0 : 1);
      return next;
    });
  }, [fadeTo]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden bg-muted', fill && 'h-full w-full', className)}
      style={fill ? undefined : { aspectRatio: toAspect(ratio) }}
    >
      {showVideo ? (
        <>
          <video
            ref={videoRef}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          >
            <source src={src} type="video/webm" />
            {srcMp4 && <source src={srcMp4} type="video/mp4" />}
          </video>
          {sound && (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? a11y.unmute : a11y.mute}
              className="absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
        </>
      ) : (
        <>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              aria-hidden
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priority ? 'high' : undefined}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          {visible && reducedMotion && (
            // Reduced motion: the loop never starts on its own — the viewer
            // presses play to opt in for this one clip.
            <button
              type="button"
              onClick={() => setMotionOptIn(true)}
              aria-label={a11y.playVideo}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65">
                <Play className="h-6 w-6 translate-x-0.5" />
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
