// Shared server-side renderer for tenant sites: theme + chrome + block tree.
// Used by /s/[site] (slug routing) and /d/[domain] (custom domains).

import { getTheme, DEFAULT_THEME } from '@/lib/themes';
import { ThemeStyle } from '@/components/theme-style';
import { SiteChrome } from '@/components/builder/site-chrome';
import { RenderNode } from '@/components/builder/render-node';
import { EditBridge } from '@/components/builder/edit-bridge';
import type { BuilderDoc, BuilderPage } from '@/lib/builder/types';

export function findPageByPath(doc: BuilderDoc, slug: string[]): BuilderPage | null {
  const target = (slug ?? []).join('/');
  return doc.pages.find((p) => p.path === target) ?? null;
}

export function SiteRenderer({ doc, page, edit }: { doc: BuilderDoc; page: BuilderPage; edit?: boolean }) {
  const theme = doc.themeId && doc.themeId !== 'auto' ? getTheme(doc.themeId) : DEFAULT_THEME;
  return (
    <>
      <ThemeStyle theme={theme} />
      {edit && <EditBridge />}
      <SiteChrome doc={doc}>
        {page.blocks.map((node) => (
          <RenderNode key={node.id} node={node} />
        ))}
      </SiteChrome>
    </>
  );
}
