'use client';

import { useEffect, useState } from 'react';
import { getTheme, DEFAULT_THEME } from '@/lib/themes';
import { ThemeStyle } from '@/components/theme-style';
import { SiteChrome } from '@/components/builder/site-chrome';
import { SiteHeader } from '@/components/site-header';
import { RenderNode } from '@/components/builder/render-node';
import { SiteAuthProvider } from '@/components/builder/site-auth-blocks';
import { useLocale } from '@/hooks/use-locale';
import { ui } from '@/lib/ui-dict';
import { builderTr } from '@/lib/builder-dict';
import type { BuilderDoc } from '@/lib/builder/types';

// Isolated live preview. Receives the full editor state via postMessage and
// re-renders instantly (no save needed). Clicking an element selects it in the
// editor; the selected element gets a highlight outline.
interface Incoming {
  source: 'builder-editor';
  doc: BuilderDoc;
  pageId: string;
  selectedId: string | null;
  previewDark?: boolean;
  siteSlug?: string;
  siteId?: string;
}

export default function BuilderPreview() {
  const { locale } = useLocale();
  const t = ui(locale).errors;
  const tr = builderTr(locale);
  const [state, setState] = useState<Incoming | null>(null);

  useEffect(() => {
    if (state?.previewDark === false) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, [state?.previewDark]);
  useEffect(() => {
    document.body.classList.add('builder-edit');

    // Drop-target highlight (scale + dashed outline) driven by the editor via
    // coordinates — reliable across the iframe boundary where native HTML5 DnD
    // events don't cross into the frame.
    let lastTarget: HTMLElement | null = null;
    const clearTarget = () => {
      if (lastTarget) lastTarget.classList.remove('b-drop-into');
      lastTarget = null;
    };
    const dropZone = (t: HTMLElement | null): HTMLElement | null =>
      t?.closest('[data-container]') ?? t?.closest('[data-nid]') ?? null;
    const highlightAt = (x: number, y: number) => {
      if (x < 0) { clearTarget(); return; }
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const zone = dropZone(el);
      if (zone !== lastTarget) {
        clearTarget();
        lastTarget = zone;
        zone?.classList.add('b-drop-into');
      }
    };
    const dropAt = (x: number, y: number, nodeType: string) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const zone = dropZone(el);
      clearTarget();
      window.parent?.postMessage({ source: 'builder-preview', type: 'drop', nodeType, targetId: zone?.getAttribute('data-nid') ?? null }, '*');
    };

    const onMsg = (e: MessageEvent) => {
      if (e.data?.source !== 'builder-editor') return;
      if (e.data.type === 'dragpoint') { highlightAt(e.data.x as number, e.data.y as number); return; }
      if (e.data.type === 'dropAt') { dropAt(e.data.x as number, e.data.y as number, e.data.nodeType as string); return; }
      setState(e.data as Incoming);
    };
    window.addEventListener('message', onMsg);
    // tell the editor we're ready to receive state
    window.parent?.postMessage({ source: 'builder-preview', type: 'ready' }, '*');

    const onClick = (ev: MouseEvent) => {
      // Never navigate away inside the editor preview (e.g. clicking the logo
      // or a button that links elsewhere) — just select the nearest node.
      const anchor = (ev.target as HTMLElement | null)?.closest('a');
      if (anchor) { ev.preventDefault(); }
      const el = (ev.target as HTMLElement | null)?.closest('[data-nid]');
      if (!el) { if (anchor) ev.stopPropagation(); return; }
      ev.preventDefault();
      ev.stopPropagation();
      window.parent?.postMessage({ source: 'builder-preview', type: 'select', id: el.getAttribute('data-nid') }, '*');
    };
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('message', onMsg);
      document.removeEventListener('click', onClick, true);
      clearTarget();
    };
  }, []);

  if (!state) {
    return <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">{t.previewLoading}</div>;
  }

  const { doc, pageId, selectedId, siteSlug, siteId } = state;
  // Give the preview the tenant context so chrome links resolve to the site
  // (not the legacy /site route) and the auth buttons render.
  const previewDoc: BuilderDoc = { ...doc, base: siteSlug ? `/s/${siteSlug}` : doc.base, siteId: siteId ?? doc.siteId };
  const page = previewDoc.pages.find((p) => p.id === pageId) ?? previewDoc.pages[0];
  const theme = previewDoc.themeId && previewDoc.themeId !== 'auto' ? getTheme(previewDoc.themeId) : DEFAULT_THEME;

  return (
    <>
      <ThemeStyle theme={theme} />
      {selectedId && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-nid="${selectedId}"]{outline:2px solid var(--primary)!important;outline-offset:2px;border-radius:2px}`,
          }}
        />
      )}
      {page ? (
        <SiteAuthProvider siteId={previewDoc.siteId ?? ''}>
          {siteSlug === '__landing__' ? (
            // The landing keeps the platform header/footer — show them frozen
            // (real header, footer placeholder) so only sections are editable.
            <main className="min-h-dvh">
              <div className="relative" aria-hidden>
                <div className="pointer-events-none select-none opacity-60">
                  <SiteHeader />
                </div>
                <span className="absolute right-2 top-2 z-50 rounded-md border border-border bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {tr('Шапка платформы — не редактируется')}
                </span>
              </div>
              {page.blocks.map((node) => (
                <RenderNode key={node.id} node={node} />
              ))}
              <div aria-hidden className="pointer-events-none select-none border-t border-border bg-card/40 px-6 py-10 text-center text-xs text-muted-foreground opacity-70">
                {tr('Подвал платформы — не редактируется')}
              </div>
            </main>
          ) : (
            <SiteChrome doc={previewDoc}>
              {page.blocks.map((node) => (
                <RenderNode key={node.id} node={node} />
              ))}
            </SiteChrome>
          )}
        </SiteAuthProvider>
      ) : (
        <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">{t.noPages}</div>
      )}
    </>
  );
}
