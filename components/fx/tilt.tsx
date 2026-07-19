'use client';

import { useRef, type ReactNode } from 'react';

/**
 * Wraps children in a subtle 3D tilt that follows the cursor on hover, with a
 * slight lift. Used for cards to add depth without a library.
 */
export function Tilt({ children, className, max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const raf = useRef(0);
  const px = useRef(0);
  const py = useRef(0);
  const canHover = typeof window !== 'undefined' ? matchMedia('(hover: hover) and (pointer: fine)').matches : true;

  // Read layout once when the pointer enters — never on every move.
  const onEnter = () => {
    if (!canHover) return;
    rect.current = ref.current?.getBoundingClientRect() ?? null;
  };
  const apply = () => {
    raf.current = 0;
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(800px) rotateX(${(-py.current * max).toFixed(2)}deg) rotateY(${(px.current * max).toFixed(2)}deg) scale(1.02)`;
  };
  const onMove = (e: React.MouseEvent) => {
    if (!canHover) return;
    const r = rect.current ?? ref.current?.getBoundingClientRect();
    if (!r) return;
    px.current = (e.clientX - r.left) / r.width - 0.5;
    py.current = (e.clientY - r.top) / r.height - 0.5;
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
    <div
      ref={ref}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ transition: 'transform 0.2s ease-out', willChange: 'transform' }}
    >
      {children}
    </div>
  );
}
