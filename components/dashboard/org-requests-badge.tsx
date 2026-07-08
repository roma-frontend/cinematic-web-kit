'use client';

// Live badge for pending organization requests on the superadmin «Организации»
// nav item. Polls the count and blinks until the superadmin opens the requests
// (which dispatches 'seen'). Sound is centralized in the header NotificationBell.

import { useCallback, useEffect, useState } from 'react';
import { usePref } from '@/hooks/use-user-prefs';

export const ORG_REQ_SEEN_EVENT = 'cwk:org-requests-seen';

export function OrgRequestsBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [seen, setSeen] = usePref<number>('org-req-seen', 0);

  const poll = useCallback(() => {
    fetch('/api/admin/org-requests?status=pending')
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) => {
        setCount(Array.isArray(d.requests) ? d.requests.length : 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [poll]);

  // The Organizations page dispatches this once its requests are shown.
  useEffect(() => {
    const onSeen = (e: Event) => {
      const n = (e as CustomEvent<number>).detail ?? count;
      setSeen(n);
    };
    window.addEventListener(ORG_REQ_SEEN_EVENT, onSeen as EventListener);
    return () => window.removeEventListener(ORG_REQ_SEEN_EVENT, onSeen as EventListener);
  }, [count, setSeen]);

  if (count <= 0) return null;
  const blink = count > seen;

  return (
    <span className="relative ml-auto flex items-center">
      {blink && <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-amber-500/60" />}
      <span className={`relative flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${blink ? 'bg-amber-500' : 'bg-amber-500/70'}`}>
        {count}
      </span>
    </span>
  );
}
