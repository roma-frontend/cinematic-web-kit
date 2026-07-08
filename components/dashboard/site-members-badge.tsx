'use client';

// Live badge for pending site-member (organization) join requests on the
// «Мои сайты» nav item. Polls the aggregate count across the owner's sites and
// blinks until the owner opens a site's members panel (which dispatches the
// 'seen' event). Sound is centralized in the header NotificationBell.

import { useCallback, useEffect, useState } from 'react';
import { usePref } from '@/hooks/use-user-prefs';

export const SITE_MEMBERS_SEEN_EVENT = 'cwk:site-members-seen';

export function SiteMembersBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [seen, setSeen] = usePref<number>('site-members-seen', 0);

  const poll = useCallback(() => {
    fetch('/api/site-members')
      .then((r) => (r.ok ? r.json() : { pending: 0 }))
      .then((d) => {
        setCount(typeof d.pending === 'number' ? d.pending : 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [poll]);

  // A site members panel dispatches this once its pending list is shown.
  useEffect(() => {
    const onSeen = (e: Event) => {
      const n = (e as CustomEvent<number>).detail ?? count;
      setSeen(n);
    };
    window.addEventListener(SITE_MEMBERS_SEEN_EVENT, onSeen as EventListener);
    return () => window.removeEventListener(SITE_MEMBERS_SEEN_EVENT, onSeen as EventListener);
  }, [count, setSeen]);

  if (count <= 0) return null;
  const blink = count > seen;

  return (
    <span className="relative ml-auto flex items-center">
      {blink && <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-amber-500/60" />}
      <span
        className={`relative flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${
          blink ? 'bg-amber-500' : 'bg-amber-500/70'
        }`}
      >
        {count}
      </span>
    </span>
  );
}
