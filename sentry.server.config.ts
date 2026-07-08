// Server-side Sentry init. Loaded from instrumentation.ts at server startup.
// Gated on SENTRY_DSN so dev/test/CI (no DSN) initialize nothing; in prod the
// DSN comes from a Fly secret. No hardcoded secrets in source.
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    enableLogs: true,
    environment: process.env.NODE_ENV,
  });
}
