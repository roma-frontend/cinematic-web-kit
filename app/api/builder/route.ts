import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSiteVersion, getSiteForUser, parseDoc, saveDraft, publishSite } from '@/lib/sites';
import { syncsLiveOnSave } from '@/lib/landing-site';
import type { BuilderDoc } from '@/lib/builder/types';
import { DEFAULT_DOC } from '@/lib/builder/types';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Tenant-scoped builder document API: ?site=<id> is required and the site
// must belong to the signed-in user. GET returns the draft doc + site meta,
// POST overwrites the draft (publishing is a separate endpoint).

async function resolveSite(request: Request) {
  const t = apiErrors(await getLocale());
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: t.loginRequired }, { status: 401 }) };
  const siteId = new URL(request.url).searchParams.get('site');
  if (!siteId) return { error: NextResponse.json({ error: t.siteNotSpecified }, { status: 400 }) };
  const site = getSiteForUser(user.id, siteId);
  if (!site) return { error: NextResponse.json({ error: t.siteNotFoundDot }, { status: 404 }) };
  return { site };
}

export async function GET(request: Request) {
  const { site, error } = await resolveSite(request);
  if (error) return error;
  const doc = parseDoc(site.draftDoc) ?? { ...structuredClone(DEFAULT_DOC), brand: site.name };
  return NextResponse.json({
    doc,
    site: { id: site.id, name: site.name, slug: site.slug, published: Boolean(site.publishedDoc) },
  });
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const { site, error } = await resolveSite(request);
  if (error) return error;

  let doc: BuilderDoc;
  try {
    doc = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!doc || !Array.isArray(doc.pages)) {
    return NextResponse.json({ error: 'Document must have a pages array' }, { status: 400 });
  }
  // Guard: unique, non-conflicting page paths.
  const paths = new Set<string>();
  for (const p of doc.pages) {
    if (typeof p.path !== 'string' || typeof p.title !== 'string' || !Array.isArray(p.blocks)) {
      return NextResponse.json({ error: 'Malformed page in document' }, { status: 400 });
    }
    if (paths.has(p.path)) {
      return NextResponse.json({ error: t.duplicatePagePath.replace('{path}', p.path) }, { status: 400 });
    }
    paths.add(p.path);
  }
  try {
    const serialized = JSON.stringify(doc);
    const changed = serialized !== site.draftDoc;
    // An unchanged save is deliberately a no-op. This prevents opening the
    // builder and pressing Save from rewriting snapshots or version history.
    if (!changed) {
      return NextResponse.json({ ok: true, changed: false, pages: doc.pages.length, published: false });
    }

    // Snapshot the previous persisted draft so every real edit is reversible.
    const previous = parseDoc(site.draftDoc);
    if (previous) createSiteVersion(site.id, site.userId, previous, 'Autosave');
    saveDraft(site, doc);
    // If the site is already live, keep the published snapshot in sync on every
    // save (and autosave) so edits appear on /s/<slug> immediately — no extra
    // "publish" step needed once the site has been published the first time.
    //
    // EXCEPTION: the landing (/). It must NOT auto-republish on save, otherwise
    // an autosave silently replaces the hand-crafted coded showcase on / (with
    // its WebGL hero, cursor, sticky story, marquees, etc.) with the builder's
    // effect-less node version. The landing only goes live via an explicit
    // "Опубликовать", and "Сбросить лендинг" restores the coded page.
    const live = syncsLiveOnSave(site);
    if (live) publishSite({ ...site, draftDoc: serialized });
    return NextResponse.json({ ok: true, changed: true, pages: doc.pages.length, published: live });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'write failed' }, { status: 500 });
  }
}
