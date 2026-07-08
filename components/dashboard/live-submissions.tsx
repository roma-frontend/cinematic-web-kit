'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Subscribes to the live submissions SSE stream and refreshes the server
// component list when a new lead arrives. Shows a small "live" indicator and a
// transient "new submission" pill. Degrades silently if EventSource/stream is
// unavailable (the page still works with a manual refresh).
export function LiveSubmissions({ liveLabel }: { liveLabel: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/submissions/stream');

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false); // browser auto-reconnects

    es.addEventListener('submission', () => {
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 4000);
      // Pull the freshly-inserted row from the server without a full reload.
      router.refresh();
    });

    return () => {
      es.close();
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [router]);

  return (
    <div className="flex items-center gap-2 text-xs" aria-live="polite">
      <span
        className={`inline-block h-2 w-2 rounded-full transition-colors ${
          connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'
        }`}
        title={connected ? 'live' : 'offline'}
      />
      {flash && (
        <span className="animate-pulse rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
          {liveLabel}
        </span>
      )}
    </div>
  );
}
