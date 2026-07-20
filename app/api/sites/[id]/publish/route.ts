import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getCurrentUser } from '@/lib/auth';
import { getManageableSite, publishSite, unpublishSite, parseDoc } from '@/lib/sites';
import { enforceFeature } from '@/lib/billing/enforce';
import { LANDING_SLUG } from '@/lib/landing-site';
import { notifySitePublished } from '@/lib/notify';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { auditSiteReadiness } from '@/lib/site-readiness';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// When the platform landing is published from the builder, propagate its theme
// to data/site.json so every *related* page that reads siteTheme() — /legal/*,
// /themes, /presets, /vitals and the marketing fallback — follows the same
// theme automatically instead of diverging.
async function syncLandingTheme(themeId?: string): Promise<void> {
  if (!themeId) return;
  const file = path.join(process.cwd(), 'data', 'site.json');
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    /* start fresh */
  }
  try {
    await writeFile(file, `${JSON.stringify({ ...current, theme: themeId }, null, 2)}\n`, 'utf8');
  } catch {
    /* best-effort — publishing must not fail if the config write fails */
  }
}

export async function POST(_req: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getManageableSite(user, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });

  const doc = parseDoc(site.draftDoc);
  if (!doc || !doc.pages.length) {
    return NextResponse.json({ error: t.nothingToPublish }, { status: 400 });
  }
  const gate = enforceFeature(user, 'sites.publish', t.forbidden);
  if (gate) return gate;
  // Notify the superadmin only on the FIRST publish (draft → live). `site` was
  // loaded before publishSite() runs, so publishedDoc still reflects the
  // pre-publish state: empty means the site has never gone live before. This
  // stops the Telegram bot from firing on every re-publish click.
  const firstPublish = !site.publishedDoc;
  const changed = publishSite(site);
  if (changed && site.slug === LANDING_SLUG) await syncLandingTheme(doc.themeId);
  else if (changed && firstPublish) notifySitePublished({ name: site.name, slug: site.slug, ownerEmail: user.email });
  const readiness = auditSiteReadiness(doc);
  return NextResponse.json({ ok: true, changed, publishedAt: changed ? new Date().toISOString() : site.publishedAt?.toISOString(), readiness });
}

export async function DELETE(_req: Request, { params }: Params) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: t.loginRequired }, { status: 401 });
  const { id } = await params;
  const site = getManageableSite(user, id);
  if (!site) return NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 });
  unpublishSite(site);
  return NextResponse.json({ ok: true });
}
