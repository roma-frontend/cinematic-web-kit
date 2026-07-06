// Shared server-side renderer for tenant sites: theme + chrome + block tree.
// Used by /s/[site] (slug routing) and /d/[domain] (custom domains).

import { getTheme, DEFAULT_THEME } from '@/lib/themes';
import { ThemeStyle } from '@/components/theme-style';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SiteChrome } from '@/components/builder/site-chrome';
import { RenderNode } from '@/components/builder/render-node';
import { EditBridge } from '@/components/builder/edit-bridge';
import { SiteAuthProvider } from '@/components/builder/site-auth-blocks';
import { SiteAuthClient } from '@/components/builder/site-auth-page';
import { getLocale } from '@/lib/i18n';
import { siteRt } from '@/lib/site-runtime-dict';
import type { BuilderDoc, BuilderPage } from '@/lib/builder/types';

export function findPageByPath(doc: BuilderDoc, slug: string[]): BuilderPage | null {
  const target = (slug ?? []).join('/');
  return doc.pages.find((p) => p.path === target) ?? null;
}

/** Reserved built-in auth paths (per tenant), not editable in the builder. */
export const AUTH_PATHS = new Set(['login', 'register', 'account']);

/** Beautiful, non-editable login / register / account page — same construction
 *  as the platform auth (glass Shell), themed with the tenant's theme and wired
 *  to the isolated per-site auth. Standalone (no site chrome). */
export function SiteAuthPage({ doc, mode }: { doc: BuilderDoc; mode: 'login' | 'register' | 'account' }) {
  const theme = doc.themeId && doc.themeId !== 'auto' ? getTheme(doc.themeId) : DEFAULT_THEME;
  const base = doc.base === undefined ? '/site' : doc.base || '';
  return (
    <>
      <ThemeStyle theme={theme} />
      <SiteAuthProvider siteId={doc.siteId ?? ''}>
        <SiteAuthClient siteId={doc.siteId ?? ''} base={base} brand={doc.brand} mode={mode} />
      </SiteAuthProvider>
    </>
  );
}

export async function SiteRenderer({ doc, page, edit, platformChrome }: { doc: BuilderDoc; page: BuilderPage; edit?: boolean; platformChrome?: boolean }) {
  const theme = doc.themeId && doc.themeId !== 'auto' ? getTheme(doc.themeId) : DEFAULT_THEME;
  const t = siteRt(await getLocale());
  const blocks = page.blocks.map((node) => (
    <RenderNode key={node.id} node={node} t={t} />
  ));
  return (
    <>
      <ThemeStyle theme={theme} />
      {edit && <EditBridge />}
      <SiteAuthProvider siteId={doc.siteId ?? ''}>
        {platformChrome ? (
          // The platform landing (/) keeps the real site header/footer — only
          // the sections between them come from the builder document.
          <main className="min-h-dvh">
            <SiteHeader />
            {blocks}
            <SiteFooter />
          </main>
        ) : (
          <SiteChrome doc={doc} t={t}>
            {blocks}
          </SiteChrome>
        )}
      </SiteAuthProvider>
    </>
  );
}
