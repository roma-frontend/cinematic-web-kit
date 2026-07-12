import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getUserEntitlements } from '@/lib/billing/entitlements';
import { getManageableSite, parseDoc } from '@/lib/sites';
import { getTheme, pickTheme } from '@/lib/themes';
import { classifyInstruction } from '@/lib/assistant-apply';

export const runtime = 'nodejs';

// Preview a theme change for a site without mutating the draft. Returns the
// current theme id/label and the proposed theme id/label so the canvas can
// render a live preview with Apply/Rollback controls.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const t = apiErrors(await getLocale());

  if (!getUserEntitlements(user).has('assistant.use')) {
    return NextResponse.json({ error: t.forbidden, feature: 'assistant.use', upgrade: '/pricing' }, { status: 403 });
  }

  if (!rateLimit(`assistant-preview-theme:${user.id}`, 20)) {
    return NextResponse.json({ error: t.tooManyRequests }, { status: 429 });
  }

  let body: { siteId?: unknown; instruction?: unknown } = {};
  try { body = await request.json(); } catch { /* empty */ }

  const siteId = typeof body.siteId === 'string' ? body.siteId.trim() : '';
  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!siteId || !instruction) {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }

  const site = getManageableSite(user, siteId);
  if (!site) {
    return NextResponse.json({ error: 'site_not_found' }, { status: 404 });
  }

  const doc = parseDoc(site.draftDoc);
  const beforeId = doc?.themeId || 'auto';
  const beforeTheme = getTheme(beforeId);

  const action = await classifyInstruction(instruction, await getLocale());
  const afterId = action.kind === 'theme' ? action.themeId : pickTheme(instruction).id;
  const afterTheme = getTheme(afterId);

  return NextResponse.json({
    beforeId: beforeTheme.id,
    beforeLabel: beforeTheme.label,
    afterId: afterTheme.id,
    afterLabel: afterTheme.label,
  });
}
