'use client';

import { createContext, useContext, useRef, Children, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

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


// Staggered reveal: direct children appear one after another on scroll.
export function Stagger({ className, children }: { className?: string; children: ReactNode }) {
  const disabled = useContext(RevealDisabled);
  if (disabled) return <div className={className}>{children}</div>;
  const items = Children.toArray(children);
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
    >
      {items.map((c, i) => (
        <motion.div
          key={i}
          variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {c}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Parallax background image — moves slower than scroll for depth.
export function ParallaxBg({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const disabled = useContext(RevealDisabled);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  if (disabled) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />;
  }
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src={src} alt="" style={{ y }} className="absolute inset-0 h-[124%] w-full object-cover" />
    </div>
  );
}
