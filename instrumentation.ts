// Next.js loads this at server startup. We use it to:
//   1. Surface environment misconfiguration early (grouped, non-throwing warnings).
//   2. Load the Sentry server/edge init (each gated on SENTRY_DSN, so key-less
//      dev/test/CI initialize nothing).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { reportEnvironment } = await import('./lib/env');
    reportEnvironment();
    await import('./sentry.server.config');
    // Start the daily Telegram digest scheduler (21:00 Asia/Yerevan). No-op
    // unless the integration + 'dailyDigest' category are configured.
    const { startDailyScheduler } = await import('./lib/daily-scheduler');
    startDailyScheduler();
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captures errors thrown in nested React Server Components / route handlers.
// No-op unless Sentry was initialized (guarded by SENTRY_DSN in the configs).
export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  // @ts-expect-error — forward Next's error args to Sentry's typed hook.
  return Sentry.captureRequestError(...args);
}
