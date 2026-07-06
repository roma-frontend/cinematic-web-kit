import { NextResponse } from 'next/server';
import { getSiteBySlug, getSiteByHostname, addSubmission, APP_HOST } from '@/lib/sites';
import { getSiteUser } from '@/lib/site-auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

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
  // Cap payload size so a hostile client can't bloat the DB.
  const json = JSON.stringify(payload);
  if (json.length > 32_000) return NextResponse.json({ error: t.formTooLarge }, { status: 400 });

  try {
    const siteId = resolveSiteId(request);
    // Attach the logged-in end-user (if any) so it shows up in their account history.
    const siteUserId = siteId ? (await getSiteUser(siteId))?.id ?? null : null;
    addSubmission(siteId, formId, payload, siteUserId);
  } catch {
    // Non-fatal: still acknowledge so the visitor-facing UX succeeds.
  }
  return NextResponse.json({ ok: true });
}
