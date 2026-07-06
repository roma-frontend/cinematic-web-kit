// Next.js loads this at server startup. We use it to surface environment
// misconfiguration early (grouped, non-throwing warnings). Kept minimal — no
// tracing/monitoring dependencies.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { reportEnvironment } = await import('./lib/env');
    reportEnvironment();
  }
}
