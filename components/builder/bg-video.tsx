'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';

/**
 * Decorative section background video. Playback is started from an effect
 * (not the autoPlay attribute) so the server and client markup always match,
 * and viewers with `prefers-reduced-motion` get a still first frame instead
 * of a moving loop — flipping the OS setting pauses/resumes live.
 */
export function BgVideo({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduced) {
      v.pause();
    } else {
      v.play().catch(() => {
        /* autoplay blocked — the first frame stays as a poster */
      });
    }
  }, [reduced]);

  return <video ref={ref} className={className} style={style} src={src} muted loop playsInline preload="metadata" aria-hidden />;
}
