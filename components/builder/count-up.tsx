'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { RevealDisabled } from './reveal';

// Animated number that counts up from 0 to the numeric part of `value` when it
// scrolls into view. Non-numeric suffix (%, +, K, ★, /7) is preserved.
export function CountUp({ value, duration = 1500 }: { value: string; duration?: number }) {
  const m = value.match(/^([\d.,]+)(.*)$/);
  const target = m ? parseFloat(m[1].replace(/,/g, '')) : null;
  const suffix = m ? m[2] : '';
  const decimals = m && m[1].includes('.') ? (m[1].split('.')[1]?.length ?? 0) : 0;
  const disabled = useContext(RevealDisabled);
  const [display, setDisplay] = useState(target === null || disabled ? (target ?? 0) : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (target === null || disabled || done.current) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else setDisplay(target);
      };
      requestAnimationFrame(tick);
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, disabled]);

  if (target === null) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{display.toFixed(decimals)}{suffix}</span>;
}
