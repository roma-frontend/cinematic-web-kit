'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { motion } from 'framer-motion';

// When true, Reveal renders statically (no scroll animation) — used for
// thumbnails/static contexts so content is always visible.
export const RevealDisabled = createContext(false);

const VARIANTS: Record<string, { initial: Record<string, number>; animate: Record<string, number> }> = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  'slide-up': { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } },
  'slide-left': { initial: { opacity: 0, x: 36 }, animate: { opacity: 1, x: 0 } },
  'slide-right': { initial: { opacity: 0, x: -36 }, animate: { opacity: 1, x: 0 } },
  zoom: { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 } },
};

// Wraps content and animates it into view on scroll (Framer Motion).
export function Reveal({ type, className, children }: { type: string; className?: string; children: ReactNode }) {
  const disabled = useContext(RevealDisabled);
  const v = VARIANTS[type] ?? VARIANTS.fade;
  if (disabled) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={v.initial}
      whileInView={v.animate}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
