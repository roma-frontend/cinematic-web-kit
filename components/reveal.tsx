'use client';

import type { ReactNode } from 'react';
import { useReveal } from '@/hooks/use-reveal';
import { usePrefersReducedMotion } from '@/hooks/use-media-query';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (for sequenced groups). */
  delay?: number;
};

/**
 * Fades + lifts its children into view when scrolled near the viewport.
 * Progressive enhancement: content is always in the DOM (SSR/no-JS friendly,
 * SEO-safe) and simply starts visible when reduced-motion is requested.
 */
export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const animate = !reduced;

  return (
    <div
      ref={ref}
      className={className}
      style={
        animate
          ? {
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(24px)',
              transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
              willChange: 'opacity, transform',
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
