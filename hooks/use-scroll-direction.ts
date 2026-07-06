'use client';

import { useEffect, useRef, useState } from 'react';

export type ScrollDirection = 'up' | 'down' | null;

/**
 * Tracks scroll direction with rAF throttling. Returns 'up' near the top and
 * when scrolling up (show header), 'down' when scrolling down (hide header).
 * Ignores iOS rubber-band overscroll. Adapted from hr-project.
 */
export function useScrollDirection(threshold = 64): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('up');
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y <= 0) {
          setDirection('up');
          lastY.current = 0;
        } else if (y < threshold) {
          setDirection('up');
          lastY.current = y;
        } else if (y > lastY.current + 5) {
          setDirection('down');
          lastY.current = y;
        } else if (y < lastY.current - 5) {
          setDirection('up');
          lastY.current = y;
        }
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return direction;
}
