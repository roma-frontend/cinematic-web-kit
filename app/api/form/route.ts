import { NextResponse } from 'next/server';
import { getSiteBySlug, getSiteByHostname, addSubmission, APP_HOST } from '@/lib/sites';
import { getSiteUser } from '@/lib/site-auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { verifyTurnstile } from '@/lib/turnstile';
import { publishSubmission } from '@/lib/realtime';

export const runtime = 'nodejs';

// Receives submissions from builder <form> elements and stores them in the
// submissions table. The owning site is resolved from where the form was
// submitted: a custom domain (Host header) or an /s/<slug> page (Referer).
function resolveSiteId(request: Request): string | null {
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').toLowerCase();
  const hostname = host.split(':')[0];
  const appHostname = APP_HOST.split(':')[0];

  if (hostname && hostname !== appHostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    if (hostname.endsWith(`.${appHostname}`)) {
      const sub = hostname.slice(0, -(appHostname.length + 1));
      const site = getSiteBySlug(sub);
      if (site) return site.id;
    } else {
      const site = getSiteByHostname(hostname);
      if (site) return site.id;
    }
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const path = new URL(referer).pathname;
      const s = path.match(/^\/s\/([^/]+)/);
      if (s) return getSiteBySlug(decodeURIComponent(s[1]))?.id ?? null;
      const d = path.match(/^\/d\/([^/]+)/);
      if (d) return getSiteByHostname(decodeURIComponent(d[1]))?.id ?? null;
    } catch {
      /* ignore malformed referer */
    }
  }
  return null;
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  let payload: Record<string, unknown> = {};
  const ct = request.headers.get('content-type') ?? '';
  try {
    if (ct.includes('application/json')) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) payload[k] = typeof v === 'string' ? v : '(file)';
    }
  } catch {
    return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
  }

  const formId = typeof payload.formId === 'string' && payload.formId ? payload.formId : 'contact';
  // Honeypot anti-spam: a hidden field only bots fill. Silently accept & drop.
  if (typeof payload._hp === 'string' && payload._hp.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  // Cloudflare Turnstile (bot protection). No-op unless TURNSTILE_SECRET_KEY is
  // set; when set, a missing/invalid token is rejected. Token field follows
  // Cloudflare's naming convention (cf-turnstile-response).
  const turnstileToken =
    (typeof payload['cf-turnstile-response'] === 'string' && payload['cf-turnstile-response']) ||
    (typeof payload._turnstile === 'string' && payload._turnstile) ||
    '';
  const clientIp = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (!(await verifyTurnstile(turnstileToken, clientIp || undefined))) {
    return NextResponse.json({ error: t.captchaFailed }, { status: 400 });
  }
  delete payload['cf-turnstile-response'];
  delete payload._turnstile;

  // Pull out control fields so they aren't stored as submission data.
  const webhook = typeof payload._webhook === 'string' ? payload._webhook : '';
  const notifyEmail = typeof payload._notifyEmail === 'string' ? payload._notifyEmail : '';
  delete payload._hp;
  delete payload._webhook;
  delete payload._notifyEmail;

  // Cap payload size so a hostile client can't bloat the DB.
  const json = JSON.stringify(payload);
  if (json.length > 32_000) return NextResponse.json({ error: t.formTooLarge }, { status: 400 });

  try {
    const siteId = resolveSiteId(request);
    // Attach the logged-in end-user (if any) so it shows up in their account history.
    const siteUserId = siteId ? (await getSiteUser(siteId))?.id ?? null : null;
    addSubmission(siteId, formId, payload, siteUserId);
    // Real-time: notify the owner's open dashboard tabs (best-effort, in-process).
    if (siteId) publishSubmission({ siteId, formId, at: new Date().toISOString() });
  } catch {
    // Non-fatal: still acknowledge so the visitor-facing UX succeeds.
  }

  // Forward to the site owner's webhook (fire-and-forget, SSRF-guarded).
  if (webhook && isSafeWebhook(webhook)) {
    void deliverWebhook(webhook, { formId, notifyEmail: notifyEmail || undefined, data: payload, at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}

/** Only allow public https endpoints — blocks SSRF to localhost/private ranges. */
function isSafeWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h === '0.0.0.0' || h === '::1') return false;
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

async function deliverWebhook(url: string, body: unknown) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      redirect: 'error',
    });
    clearTimeout(timer);
  } catch {
    /* best-effort: never fail the visitor's submission on webhook errors */
  }
}
