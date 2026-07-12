import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getUserEntitlements } from '@/lib/billing/entitlements';
import { getManageableSite, parseDoc, saveDraft } from '@/lib/sites';
import { getTheme } from '@/lib/themes';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Apply a theme to a site's draft document. This is a real mutation, so it is
// rate-limited and audited; the assistant canvas asks for explicit confirmation
// before calling it.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const t = apiErrors(await getLocale());

  if (!getUserEntitlements(user).has('assistant.use')) {
    return NextResponse.json({ error: t.forbidden, feature: 'assistant.use', upgrade: '/pricing' }, { status: 403 });
  }

  if (!rateLimit(`assistant-site-theme:${user.id}`, 30)) {
    return NextResponse.json({ error: t.tooManyRequests }, { status: 429 });
  }

  let body: { siteId?: unknown; themeId?: unknown } = {};
  try { body = await request.json(); } catch { /* empty */ }

  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
  const themeId = typeof body.themeId === 'string' ? body.themeId.trim() : '';
  if (!siteId || !themeId) {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }

  const site = getManageableSite(user, siteId);
  if (!site) {
    return NextResponse.json({ error: 'site_not_found' }, { status: 404 });
  }

  const theme = getTheme(themeId);
  const doc = parseDoc(site.draftDoc);
  if (!doc) {
    return NextResponse.json({ error: 'corrupted_site_doc' }, { status: 422 });
  }

  doc.themeId = theme.id;
  saveDraft(site, doc);
  recordAudit({ id: user.id, email: user.email }, 'assistant.apply_theme', site.id, `theme=${theme.id}`);

  return NextResponse.json({ themeId: theme.id, label: theme.label });
}
