'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

type UseRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
};

/**
 * Shared IntersectionObserver hook for reveal-on-scroll animations. One
 * observer per element; disconnects after first reveal when `once` (default).
 * Adapted from hr-project.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseRevealOptions = {},
): { ref: RefObject<T | null>; visible: boolean } {
  const { threshold = 0.15, rootMargin = '-40px', once = true } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}
