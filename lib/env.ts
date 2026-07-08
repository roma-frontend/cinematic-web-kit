// Startup environment validation. Adapted from hr-project's env-validation, but
// tailored to this project: nothing is strictly *required* (the app runs with
// zero config using local storage + console-email fallbacks), so we surface
// grouped, actionable warnings/errors instead of throwing — a misconfigured
// deployment stays up and degrades gracefully.

export type EnvLevel = 'error' | 'warn';
export type EnvIssue = { level: EnvLevel; key: string; message: string };

// Cloudflare R2 is all-or-nothing: a partial set silently disables uploads.
const R2_REQUIRED = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'] as const;

type Env = Record<string, string | undefined>;

/** Compute environment issues without side effects (unit-testable). */
export function checkEnvironment(env: Env = process.env): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const has = (k: string) => typeof env[k] === 'string' && env[k]!.trim() !== '';
  const isProd = env.NODE_ENV === 'production';

  if (isProd && !has('NEXT_PUBLIC_APP_HOST')) {
    issues.push({
      level: 'warn',
      key: 'NEXT_PUBLIC_APP_HOST',
      message:
        'NEXT_PUBLIC_APP_HOST is not set — canonical URLs, sitemap and subdomain links fall back to localhost:3000.',
    });
  }

  const r2Present = R2_REQUIRED.filter(has);
  if (r2Present.length > 0 && r2Present.length < R2_REQUIRED.length) {
    const missing = R2_REQUIRED.filter((k) => !has(k));
    issues.push({
      level: 'error',
      key: 'R2',
      message: `Cloudflare R2 is partially configured — missing: ${missing.join(', ')}. Uploads fall back to local /uploads until all keys are set.`,
    });
  }
  if (r2Present.length === R2_REQUIRED.length && !has('R2_PUBLIC_BASE_URL')) {
    issues.push({
      level: 'warn',
      key: 'R2_PUBLIC_BASE_URL',
      message: 'R2 is configured but R2_PUBLIC_BASE_URL is not set — stored media has no public URL.',
    });
  }

  if (!has('RESEND_API_KEY') && !has('BREVO_API_KEY')) {
    issues.push({
      level: 'warn',
      key: 'EMAIL',
      message:
        'No email provider (RESEND_API_KEY / BREVO_API_KEY) — login codes and password resets print to the server console (dev fallback).',
    });
  }

  if (!has('MUAPI_KEY')) {
    issues.push({
      level: 'warn',
      key: 'MUAPI_KEY',
      message: 'MUAPI_KEY is not set — AI video generation is disabled (existing clips still render).',
    });
  }

  // Turnstile is all-or-nothing: the widget needs the public site key AND the
  // server needs the secret. A half set silently disables bot protection.
  const tsSite = has('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
  const tsSecret = has('TURNSTILE_SECRET_KEY');
  if (tsSite !== tsSecret) {
    issues.push({
      level: 'warn',
      key: 'TURNSTILE',
      message: `Turnstile is partially configured — set BOTH NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY (missing: ${tsSite ? 'TURNSTILE_SECRET_KEY' : 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'}). Bot protection stays off until both are set.`,
    });
  }

  // Workers AI needs an account id (or R2_ACCOUNT_ID) plus a token.
  if (has('CF_AI_TOKEN') && !has('CF_ACCOUNT_ID') && !has('R2_ACCOUNT_ID')) {
    issues.push({
      level: 'warn',
      key: 'CF_AI',
      message: 'CF_AI_TOKEN is set but no CF_ACCOUNT_ID / R2_ACCOUNT_ID — Workers AI calls will be skipped.',
    });
  }

  return issues;
}

/** Log environment issues to the console. Never throws. Returns the issues. */
export function reportEnvironment(env: Env = process.env): EnvIssue[] {
  const issues = checkEnvironment(env);
  for (const i of issues) {
    const line = `[env] ${i.message}`;
    if (i.level === 'error') console.error(`❌ ${line}`);
    else console.warn(`⚠️  ${line}`);
  }
  if (!issues.some((i) => i.level === 'error')) {
    console.log('✅ Environment check passed');
  }
  return issues;
}
