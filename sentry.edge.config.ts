// Edge-runtime Sentry init (middleware, edge routes). Loaded from
// instrumentation.ts. Gated on SENTRY_DSN — no-op without it, no hardcoded secrets.
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    enableLogs: true,
    environment: process.env.NODE_ENV,
  });
}
