// Transactional email over plain fetch — zero new dependencies, mirroring
// lib/notify.ts. Two free HTTP providers are supported and tried in order
// (automatic failover), so the kit stays on free tiers with real headroom:
//   - Resend  (RESEND_API_KEY)  — 3 000 писем/мес бесплатно
//   - Brevo   (BREVO_API_KEY)   — 300 писем/день бесплатно (~9 000/мес)
// With no keys configured, emails are printed to the server console (dev/test)
// so flows remain fully testable offline. See docs/EMAIL_SETUP.md.

import 'server-only';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative (deliverability + clients with HTML off). */
  text?: string;
}

export interface SendResult {
  ok: boolean;
  /** Which transport accepted the message: 'resend' | 'brevo' | 'console'. */
  provider: string;
  error?: string;
}

const TIMEOUT_MS = 10_000;

/** Sender identity. EMAIL_FROM is required for real providers, e.g. "info@example.com". */
function sender() {
  return {
    email: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    name: process.env.EMAIL_FROM_NAME || 'Builder Studio',
    replyTo: process.env.EMAIL_REPLY_TO || '',
  };
}

/** True when at least one real provider is configured — gates the login OTP. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY);
}

/** Email OTP at login is on whenever a provider is configured (opt out: AUTH_EMAIL_OTP=off). */
export function loginOtpEnabled(): boolean {
  return emailConfigured() && process.env.AUTH_EMAIL_OTP !== 'off';
}

async function sendViaResend(msg: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, provider: 'resend', error: 'not configured' };
  const from = sender();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `${from.name} <${from.email}>`,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
        ...(from.replyTo ? { reply_to: from.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, provider: 'resend', error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}` };
    }
    return { ok: true, provider: 'resend' };
  } catch (e) {
    return { ok: false, provider: 'resend', error: e instanceof Error ? e.message : 'network error' };
  }
}

async function sendViaBrevo(msg: EmailMessage): Promise<SendResult> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: false, provider: 'brevo', error: 'not configured' };
  const from = sender();
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: [{ email: msg.to }],
        subject: msg.subject,
        htmlContent: msg.html,
        ...(msg.text ? { textContent: msg.text } : {}),
        ...(from.replyTo ? { replyTo: { email: from.replyTo } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, provider: 'brevo', error: `HTTP ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}` };
    }
    return { ok: true, provider: 'brevo' };
  } catch (e) {
    return { ok: false, provider: 'brevo', error: e instanceof Error ? e.message : 'network error' };
  }
}

/** Dev/test transport: print the message so codes/links are usable offline. */
function sendViaConsole(msg: EmailMessage): SendResult {
   
  console.log(`[email → ${msg.to}] ${msg.subject}\n${msg.text ?? msg.html}`);
  return { ok: true, provider: 'console' };
}

/**
 * Send a transactional email. Tries the preferred provider first
 * (EMAIL_PROVIDER=resend|brevo, default resend), fails over to the other,
 * falls back to console when nothing is configured. Never throws.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  if (!emailConfigured()) return sendViaConsole(msg);

  const order =
    (process.env.EMAIL_PROVIDER || 'resend').toLowerCase() === 'brevo'
      ? [sendViaBrevo, sendViaResend]
      : [sendViaResend, sendViaBrevo];

  const failures: SendResult[] = [];
  for (const attempt of order) {
    const result = await attempt(msg);
    if (result.ok) return result;
    failures.push(result);
  }
  // Preserve the configured provider's response. The fallback provider may
  // simply be absent, which must not hide the actual delivery failure.
  const relevant = failures.find((result) => result.error !== 'not configured') ?? failures.at(-1) ?? {
    ok: false,
    provider: 'none',
    error: 'no provider',
  };
  const error = failures.map((result) => `${result.provider}: ${result.error ?? 'unknown error'}`).join('; ');
  console.error(`[email] delivery failed: ${error}`);
  return { ...relevant, error };
}
