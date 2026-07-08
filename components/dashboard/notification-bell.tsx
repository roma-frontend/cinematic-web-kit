'use client';

// Header notification bell: shows the number of unseen dashboard events across
// everything the user should hear about — new form submissions, pending member
// join requests, and (for superadmins) new organization requests. Subscribes to
// the unified SSE stream (/api/notifications/stream), so any new event instantly
// bumps the count: the badge blinks and a soft chime plays. Clicking the bell
// (or visiting the Submissions page) marks everything seen. The "seen" baseline
// is DB-backed (usePref) so it follows the account across devices.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { playChime } from '@/components/dashboard/chime';
import { usePref } from '@/hooks/use-user-prefs';
import { useLocale } from '@/hooks/use-locale';
import { dashDict } from '@/lib/dashboard-dict';

const SUBMISSIONS_PATH = '/dashboard/submissions';

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = dashDict(useLocale().locale);
  // Total events the client knows about (server snapshot + live bumps).
  const [count, setCount] = useState(initialCount);
  // DB-backed "seen up to this total". Fallback = initialCount so a first-ever
  // load never blinks for historical items — only genuinely new ones do.
  const [seen, setSeen] = usePref<number>('notif-seen', initialCount);
  const seenRef = useRef(seen);
  useEffect(() => { seenRef.current = seen; }, [seen]);

  const unseen = Math.max(0, count - seen);
  const blink = unseen > 0;

  // Live stream: every new event bumps the total, blinks + chimes when it
  // pushes the count past what the user has already seen.
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/notifications/stream');
      es.addEventListener('notify', () => {
        setCount((c) => {
          const next = c + 1;
          if (next > seenRef.current) playChime();
          return next;
        });
      });
    } catch {
      /* EventSource unsupported — the initial badge still renders */
    }
    return () => es?.close();
  }, []);

  const markSeen = useCallback(() => {
    if (count !== seen) setSeen(count);
  }, [count, seen, setSeen]);

  // Opening the Submissions page (via the bell or the nav) clears the badge.
  useEffect(() => {
    if (pathname === SUBMISSIONS_PATH) markSeen();
  }, [pathname, markSeen]);

  const onClick = () => {
    markSeen();
    router.push(SUBMISSIONS_PATH);
  };

  const label = t.nav.notifications ?? 'Notifications';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unseen > 0 ? `${label} (${unseen})` : label}
      title={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell className={`h-4 w-4 ${blink ? 'text-amber-500' : ''}`} />
      {unseen > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex items-center">
          {blink && <span className="absolute inline-flex h-5 w-5 animate-ping rounded-full bg-amber-500/60" />}
          <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white animate-pulse">
            {unseen > 99 ? '99+' : unseen}
          </span>
        </span>
      )}
    </button>
  );
}
