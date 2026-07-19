'use client';

import { useRef, type ReactNode } from 'react';

/**
 * Magnetic hover: the wrapped element gently pulls toward the cursor. Great for
 * primary CTAs. Inline-block so it hugs its content.
 */
export function Magnetic({ children, pull = 0.25 }: { children: ReactNode; pull?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const raf = useRef(0);
  const x = useRef(0);
  const y = useRef(0);
  const canHover = typeof window !== 'undefined' ? matchMedia('(hover: hover) and (pointer: fine)').matches : true;

  const onEnter = () => {
    if (!canHover) return;
    rect.current = ref.current?.getBoundingClientRect() ?? null;
  };
  const apply = () => {
    raf.current = 0;
    if (ref.current) ref.current.style.transform = `translate(${x.current.toFixed(1)}px, ${y.current.toFixed(1)}px)`;
  };
  const onMove = (e: React.MouseEvent) => {
    if (!canHover) return;
    const r = rect.current ?? ref.current?.getBoundingClientRect();
    if (!r) return;
    x.current = (e.clientX - (r.left + r.width / 2)) * pull;
    y.current = (e.clientY - (r.top + r.height / 2)) * pull;
    if (!raf.current) raf.current = requestAnimationFrame(apply);
  };
  const reset = () => {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <span
      ref={ref}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ display: 'inline-block', transition: 'transform 0.2s ease-out', willChange: 'transform' }}
    >
      {children}
    </span>
  );
}
