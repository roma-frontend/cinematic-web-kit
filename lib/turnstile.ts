import 'server-only';

// Cloudflare Turnstile — free, privacy-friendly CAPTCHA alternative. Verifies
// that a form/login submission came from a human, without the "pick the traffic
// lights" friction and without tracking users.
//
// Setup (free): dash.cloudflare.com → Turnstile → add a widget, then set:
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (public — rendered in the widget)
//   TURNSTILE_SECRET_KEY            (server-only — used here to verify)
//
// When the secret is NOT set, turnstileEnabled() is false and verifyTurnstile()
// returns true (open) — so the app keeps working exactly as before until you
// switch it on.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** True when server-side verification is configured. */
export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token against Cloudflare. Returns true when the token is
 * valid — or when Turnstile is not configured (fail-open, preserves prior
 * behavior). Returns false only when configured AND the token is missing/invalid.
 * Never throws.
 */
export async function verifyTurnstile(token: string | undefined | null, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → don't block
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
