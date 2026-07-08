// Browser-side Sentry init. Next.js runs this on the client automatically.
// Gated on NEXT_PUBLIC_SENTRY_DSN — renders/initializes nothing without it, so
// the default build ships no error-monitoring code path.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Session replay is opt-in via env (adds weight). Errors + basic perf by default.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? '0'),
    replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE ?? '0'),
    environment: process.env.NODE_ENV,
  });
}

// Required by Next.js for navigation instrumentation (safe no-op if DSN unset).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
