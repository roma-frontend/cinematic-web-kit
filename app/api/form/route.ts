import { NextResponse } from 'next/server';
import { getSiteBySlug, getSiteByHostname, addSubmission, submissionCount, APP_HOST, getSite } from '@/lib/sites';
import { getSiteUser } from '@/lib/site-auth';
import { getDb, users } from '@/lib/db';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { verifyTurnstile } from '@/lib/turnstile';
import { publishSubmission } from '@/lib/realtime';
import { notifySubmission } from '@/lib/notify';
import { sendEmail } from '@/lib/email';
import { eq } from 'drizzle-orm';

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
  // Time-trap: a hidden timestamp set when the form opened. Humans take ≥1.5s
  // to fill a form; bots submit instantly. Silently accept & drop fast submits.
  if (typeof payload._t === 'number' && Number.isFinite(payload._t)) {
    const elapsed = Date.now() - payload._t;
    if (elapsed >= 0 && elapsed < 1500) return NextResponse.json({ ok: true });
  }

  // Cloudflare Turnstile (bot protection). Two modes:
  //  • Required: the form set `_turnstileRequired: true` (builder marks
  //    sensitive forms) → a valid token MUST be supplied.
  //  • Verify-if-present: otherwise a token is validated when supplied, but its
  //    absence does NOT block submission — so forms keep working on pages that
  //    don't (yet) render the widget. The honeypot/time-trap remain the baseline.
  const turnstileRequired = payload._turnstileRequired === true;
  const turnstileToken =
    (typeof payload['cf-turnstile-response'] === 'string' && payload['cf-turnstile-response']) ||
    (typeof payload._turnstile === 'string' && payload._turnstile) ||
    '';
  const clientIp = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (turnstileRequired && !turnstileToken) {
    return NextResponse.json({ error: t.captchaFailed }, { status: 400 });
  }
  if (turnstileToken && !(await verifyTurnstile(turnstileToken, clientIp || undefined))) {
    return NextResponse.json({ error: t.captchaFailed }, { status: 400 });
  }
  delete payload['cf-turnstile-response'];
  delete payload._turnstile;

  // Pull out control fields so they aren't stored as submission data.
  const webhook = typeof payload._webhook === 'string' ? payload._webhook : '';
  const notifyEmail = typeof payload._notifyEmail === 'string' ? payload._notifyEmail : '';
  delete payload._hp;
  delete payload._t;
  delete payload._turnstileRequired;
  delete payload._webhook;
  delete payload._notifyEmail;

  // Cap payload size so a hostile client can't bloat the DB.
  const json = JSON.stringify(payload);
  if (json.length > 32_000) return NextResponse.json({ error: t.formTooLarge }, { status: 400 });

  try {
    const siteId = resolveSiteId(request);
    // Attach the logged-in end-user (if any) so it shows up in their account history.
    const siteUserId = siteId ? (await getSiteUser(siteId))?.id ?? null : null;
    const first = siteId ? submissionCount(siteId) === 0 : false;
    addSubmission(siteId, formId, payload, siteUserId);
    // Real-time: notify the owner's open dashboard tabs (best-effort, in-process).
    if (siteId) publishSubmission({ siteId, siteName: getSite(siteId)?.name, formId, first, at: new Date().toISOString() });
    if (siteId) await emailSiteOwner(siteId, formId, payload);
    // Telegram: notify the platform owner of a new lead (best-effort, gated).
    notifySubmission({ siteName: siteId ? getSite(siteId)?.name : undefined, formId, fields: payload });
  } catch {
    // Non-fatal: still acknowledge so the visitor-facing UX succeeds.
  }

  // Forward to the site owner's webhook (fire-and-forget, SSRF-guarded).
  if (webhook && isSafeWebhook(webhook)) {
    void deliverWebhook(webhook, { formId, notifyEmail: notifyEmail || undefined, data: payload, at: new Date().toISOString() });
  }
  return NextResponse.json({ ok: true });
}

function escHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function emailSiteOwner(siteId: string, formId: string, fields: Record<string, unknown>): Promise<void> {
  const site = getSite(siteId);
  if (!site) return;
  const owner = getDb().select({ email: users.email, name: users.name }).from(users).where(eq(users.id, site.userId)).get();
  if (!owner?.email) return;
  const rows = Object.entries(fields)
    .filter(([k]) => !k.startsWith('_') && k !== 'formId')
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#666">${escHtml(k)}</td><td style="padding:6px 12px;font-weight:600">${escHtml(v)}</td></tr>`)
    .join('');
  const textRows = Object.entries(fields)
    .filter(([k]) => !k.startsWith('_') && k !== 'formId')
    .map(([k, v]) => `${k}: ${String(v ?? '')}`)
    .join('\n');
  const subject = `Новая заявка — ${site.name}`;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 8px">Новая заявка с сайта ${escHtml(site.name)}</h2>
      <p style="margin:0 0 16px;color:#666">Форма: <b>${escHtml(formId)}</b></p>
      <table style="border-collapse:collapse;border:1px solid #eee;border-radius:12px;overflow:hidden">${rows}</table>
      <p style="margin-top:16px;color:#666;font-size:13px">Заявка также сохранена в дашборде организации.</p>
    </div>`;
  const result = await sendEmail({
    to: owner.email,
    subject,
    html,
    text: `Новая заявка с сайта ${site.name}\nФорма: ${formId}\n\n${textRows}\n\nЗаявка также сохранена в дашборде организации.`,
  });
  if (!result.ok) {
    console.warn(`[form email] failed to notify site owner ${owner.email} for site ${site.id}: ${result.provider} ${result.error ?? ''}`);
  }
}

/** Only allow public https endpoints — blocks SSRF to localhost/private ranges.
 *  NOTE: hostname-based only. Does not defend against DNS rebinding (the host
 *  is checked, not the resolved IP). If that becomes a concern, resolve the
 *  hostname and validate the IP immediately before the fetch. */
function isSafeWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    // Hostnames that should never be a webhook target.
    if (h === 'localhost' || h.endsWith('.local') || h === '0.0.0.0' || h === '::1') return false;
    // IPv4 private / loopback / link-local ranges.
    if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return false;
    // IPv6 link-local (fe80::/10) and unique-local (fc00::/7, covers fd00::/8).
    if (/^fe[89ab][0-9a-f]?:/.test(h) || /^f[cd][0-9a-f]{2}:/.test(h)) return false;
    // IPv4-mapped IPv6 loopback (::ffff:127.0.0.1).
    if (/^::ffff:127\./.test(h)) return false;
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
