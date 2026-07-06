'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Options = { rootMargin?: string; threshold?: number | number[] };

const DEFAULT_THRESHOLD = [0, 0.2, 0.4, 0.6];

/**
 * Returns the id of the section currently in view — for scroll-spy navigation
 * (highlighting the active anchor). Re-attaches when sections mount later
 * (e.g. after a dynamic import). Adapted from hr-project.
 */
export function useActiveSection(sectionIds: string[], options: Options = {}): string | null {
  const rootMargin = options.rootMargin ?? '-40% 0px -55% 0px';
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  // Keyed state: when the id list changes, the stale entry reads as null on the
  // very next render — no reset-in-effect needed.
  const [state, setState] = useState<{ key: string; id: string | null } | null>(null);
  const entriesRef = useRef<Map<string, IntersectionObserverEntry>>(new Map());
  const idsKey = useMemo(() => sectionIds.join('|'), [sectionIds]);
  const thresholdKey = useMemo(() => JSON.stringify(threshold), [threshold]);
  const active = state && state.key === idsKey && sectionIds.length ? state.id : null;

  useEffect(() => {
    if (typeof window === 'undefined' || !sectionIds.length) return;

    let observer: IntersectionObserver | null = null;

    const setup = () => {
      observer?.disconnect();
      entriesRef.current.clear();

      const elements = sectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[];
      if (!elements.length) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) entriesRef.current.set(entry.target.id, entry);

          let bestId: string | null = null;
          let bestRatio = 0;
          entriesRef.current.forEach((entry, id) => {
            if (entry.isIntersecting && entry.intersectionRatio >= bestRatio) {
              bestRatio = entry.intersectionRatio;
              bestId = id;
            }
          });
          if (bestId) setState({ key: idsKey, id: bestId });
        },
        { root: null, rootMargin, threshold },
      );

      elements.forEach((el) => observer!.observe(el));
    };

    setup();
    const mo = new MutationObserver(() => setup());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, rootMargin, thresholdKey]);

  return active;
}
