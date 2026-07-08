import 'server-only';
import { DIGEST_HOUR, DIGEST_TZ } from '@/lib/telegram-digest';

// In-process daily scheduler: fires the Telegram daily digest at DIGEST_HOUR
// (21:00) Yerevan time. This app runs as a single long-lived Node server on
// Fly.io (SQLite, one machine), so a process-local timer is reliable and needs
// no external cron. Guarded on globalThis so Next.js dev HMR / repeated
// instrumentation calls never start more than one timer.

const g = globalThis as unknown as { __cwkDigestTimer?: ReturnType<typeof setTimeout> };

/** ms until the next occurrence of `hour`:00 in the Yerevan timezone. */
function msUntilNext(hour: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DIGEST_TZ, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const nowSec = get('hour') * 3600 + get('minute') * 60 + get('second');
  let until = hour * 3600 - nowSec;
  if (until <= 0) until += 24 * 3600;
  return until * 1000;
}

function scheduleNext(): void {
  const delay = msUntilNext(DIGEST_HOUR);
  g.__cwkDigestTimer = setTimeout(async () => {
    try {
      const { sendDailyDigest } = await import('@/lib/telegram-digest');
      await sendDailyDigest();
    } catch {
      /* best-effort: a failed digest must never crash the server */
    } finally {
      scheduleNext(); // re-arm for the following day
    }
  }, delay);
  // Don't keep the event loop alive solely for this timer.
  if (typeof g.__cwkDigestTimer?.unref === 'function') g.__cwkDigestTimer.unref();
}

/** Start the daily-digest scheduler once per process. Safe to call repeatedly. */
export function startDailyScheduler(): void {
  if (g.__cwkDigestTimer) return; // already scheduled in this process
  scheduleNext();
}
