'use client';

import { useEffect, useRef } from 'react';

/**
 * Premium custom cursor: a small precise ring dot + a large blurred primary
 * glow that trails the pointer with easing. Desktop only (fine pointer) and
 * disabled under prefers-reduced-motion. Purely decorative (pointer-events:none)
 * and self-cleaning, so it never interferes with clicks or touch devices.
 */
export function CursorGlow() {
  const dot = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let gx = mx;
    let gy = my;
    let raf = 0;
    let visible = false;

    const tick = () => {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      if (glow.current) glow.current.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      // Stop once the glow has caught the pointer; the next move restarts it, so
      // the main thread stays fully idle while the cursor is still.
      if (Math.abs(mx - gx) > 0.4 || Math.abs(my - gy) > 0.4) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };
    const kick = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target as HTMLElement | null;
      const inHeader = Boolean(t?.closest('header'));
      if (!visible) {
        visible = true;
        if (dot.current) dot.current.style.opacity = '1';
      }
      if (glow.current) glow.current.style.opacity = inHeader ? '0' : '1';
      if (dot.current) dot.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      if (inHeader) {
        gx = mx;
        gy = my;
        if (glow.current) glow.current.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      }
      kick();
    };
    const onLeave = () => {
      visible = false;
      if (dot.current) dot.current.style.opacity = '0';
      if (glow.current) glow.current.style.opacity = '0';
    };
    // Keep the cursor precise over sticky headers: dense nav bars make the
    // large hover affordance feel like the cursor has slipped off target.
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const interactive = t.closest('a, button, [role="button"], input, select, textarea, label');
      const inHeader = t.closest('header');
      if (dot.current) dot.current.style.setProperty('--dot-scale', interactive && !inHeader ? '1.35' : '1');
    };
    const onVis = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else {
        kick();
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <>
      <div
        ref={glow}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[70] h-[320px] w-[320px] rounded-full opacity-0 blur-[60px] transition-opacity duration-300 will-change-transform"
        style={{ background: 'radial-gradient(circle, color-mix(in oklch, var(--primary) 40%, transparent), transparent 65%)' }}
      />
      <div
        ref={dot}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[71] hidden h-5 w-5 rounded-full border border-primary/80 bg-background/10 opacity-0 shadow-[0_0_0_1px_color-mix(in_oklch,var(--background)_45%,transparent)] transition-[opacity,scale] duration-150 will-change-transform lg:block"
        style={{ scale: 'var(--dot-scale, 1)' }}
      />
    </>
  );
}
