'use client';

// Mounts a tour on a page: auto-starts it on the user's first visit (tracked in
// DB-backed prefs so it never re-nags across devices), persists the "seen" flag
// on finish/skip, and offers a floating replay button so it can be re-watched
// any time. Drop one <TourLauncher tour="…"/> per page.

import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { usePrefs, setPref } from '@/hooks/use-user-prefs';
import { getTour, tourChrome } from '@/lib/tour/tours';
import type { TourId } from '@/lib/tour/types';
import { OnboardingTour } from '@/components/tour/onboarding-tour';

export function TourLauncher({ tour, autoStart = true }: { tour: TourId; autoStart?: boolean }) {
  const locale = useLocale().locale;
  const prefs = usePrefs(); // null until the account's prefs load
  const [active, setActive] = useState(false);
  const [reduced] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
  const seenKey = `tour:${tour}`;
  const soundOn = prefs ? prefs['tourSound'] !== false : true;

  // First-run auto-start: prefs loaded AND this tour was never seen. We mark it
  // seen in the DB the moment it opens, so it shows automatically exactly once —
  // afterwards it's available only via the "Show tour" button.
  useEffect(() => {
    if (!autoStart || prefs === null) return;
    if (prefs[seenKey] === true) return;
    const t = setTimeout(() => { setActive(true); setPref(seenKey, true); }, 650);
    return () => clearTimeout(t);
  }, [prefs, autoStart, seenKey]);

  const chrome = tourChrome(locale);
  const def = getTour(tour, locale);

  // Replay from the button just closes; the seen flag was already persisted.
  const done = () => { setActive(false); if (prefs && prefs[seenKey] !== true) setPref(seenKey, true); };

  return (
    <>
      {active && (
        <OnboardingTour
          steps={def.steps}
          chrome={chrome}
          soundOn={soundOn}
          onToggleSound={() => setPref('tourSound', !soundOn)}
          reduced={reduced}
          onComplete={done}
          onSkip={done}
        />
      )}
      {!active && (
        <button
          onClick={() => setActive(true)}
          title={chrome.replay}
          className="fixed bottom-[5.5rem] right-5 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur transition-all hover:scale-[1.03] hover:shadow-xl"
        >
          <HelpCircle className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{chrome.replay}</span>
        </button>
      )}
    </>
  );
}
