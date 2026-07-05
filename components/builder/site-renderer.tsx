// Shared server-side renderer for tenant sites: theme + chrome + block tree.
// Used by /s/[site] (slug routing) and /d/[domain] (custom domains).

import { getTheme, DEFAULT_THEME } from '@/lib/themes';
import { ThemeStyle } from '@/components/theme-style';
import { SiteChrome } from '@/components/builder/site-chrome';
import { RenderNode } from '@/components/builder/render-node';
import { EditBridge } from '@/components/builder/edit-bridge';
import { SiteAuthProvider } from '@/components/builder/site-auth-blocks';
import { SiteAuthClient } from '@/components/builder/site-auth-page';
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

export function SiteRenderer({ doc, page, edit }: { doc: BuilderDoc; page: BuilderPage; edit?: boolean }) {
  const theme = doc.themeId && doc.themeId !== 'auto' ? getTheme(doc.themeId) : DEFAULT_THEME;
  return (
    <>
      <ThemeStyle theme={theme} />
      {edit && <EditBridge />}
      <SiteAuthProvider siteId={doc.siteId ?? ''}>
        <SiteChrome doc={doc}>
          {page.blocks.map((node) => (
            <RenderNode key={node.id} node={node} />
          ))}
        </SiteChrome>
      </SiteAuthProvider>
    </>
  );
}
