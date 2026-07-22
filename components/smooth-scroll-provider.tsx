'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function SmoothScrollProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // App shells such as the dashboard own an internal scroll container.
    // Lenis targets window and would consume trackpad wheel events before they
    // reach that container, so keep native scrolling on dashboard routes.
    if (pathname.startsWith('/dashboard')) return;
    if (pathname.startsWith('/studio')) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    if (mq.matches) return; // respect reduced motion
    // Keep native scroll on touch for performance
    if (coarse.matches) return;

    let cancelled = false;
    let stop = () => {};
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const start = async () => {
      try {
        const { default: Lenis } = await import('lenis');
        if (cancelled) return;
        // Guard double init
        if ((window as unknown as Record<string, unknown>).__lenis) return;
        const lenis = new Lenis({
          duration: 1.0,
          easing: (t: number) => t,
          smoothWheel: true,
          syncTouch: false,
        });
        (window as unknown as Record<string, unknown>).__lenis = lenis;
        let rafId = 0;
        const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
        rafId = requestAnimationFrame(raf);
        const onVis = () => document.hidden ? lenis.stop() : lenis.start();
        document.addEventListener('visibilitychange', onVis);
        stop = () => { cancelAnimationFrame(rafId); document.removeEventListener('visibilitychange', onVis); lenis.destroy(); (window as unknown as Record<string, unknown>).__lenis = undefined; };
      } catch {
        /* ignore */
      }
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(start, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(start, 0);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      stop();
    };
  }, [pathname]);

  return null;
}
