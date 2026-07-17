'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { updateProps } from '@/lib/builder/tree';

// Human labels (Russian source; localised via builderTr) for the hover badge.
const TYPE_LABEL: Record<string, string> = {
  section: 'Секция', row: 'Ряд', stack: 'Стек', grid: 'Сетка', column: 'Колонка',
  card: 'Карточка', heading: 'Заголовок', text: 'Текст', button: 'Кнопка',
  image: 'Изображение', video: 'Видео', form: 'Форма', divider: 'Разделитель',
  spacer: 'Отступ', icon: 'Иконка', gallery: 'Галерея', hero: 'Герой', list: 'Список',
  quote: 'Цитата', embed: 'Встраивание', link: 'Ссылка', badge: 'Бейдж', logo: 'Логотип',
};

// Isolated live preview. Receives the full editor state via postMessage and
// re-renders instantly (no save needed). Clicking an element selects it in the
// editor; the selected element gets a highlight outline.
interface Incoming {
  source: 'builder-editor';
  doc: BuilderDoc;
  pageId: string;
  selectedId: string | null;
  previewDark?: boolean;
  previewMode?: 'fast' | 'design' | 'live';
  siteSlug?: string;
  siteId?: string;
}

export default function BuilderPreview() {
  const { locale } = useLocale();
  const t = ui(locale).errors;
  const tr = builderTr(locale);
  const trRef = useRef(tr);
  useEffect(() => { trRef.current = tr; });
  const [state, setState] = useState<Incoming | null>(null);
  const [themeOverride, setThemeOverride] = useState<string | null>(null);
  const themeFadeTimer = useRef<number | null>(null);

  // Report the selected element's viewport rect to the editor so it can float a
  // mini-toolbar over the iframe. Re-sent on scroll/resize so it stays glued.
  const selIdRef = useRef<string | null>(null);
  const postRect = useCallback(() => {
    const id = selIdRef.current;
    if (!id) { window.parent?.postMessage({ source: 'builder-preview', type: 'rect', id: null, rect: null }, '*'); return; }
    const el = document.querySelector<HTMLElement>(`[data-nid="${CSS.escape(id)}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Effective colors for the WCAG badge: text color + nearest opaque backdrop.
    const cs = getComputedStyle(el);
    const color = cs.color;
    let bg = '';
    let walk: HTMLElement | null = el;
    while (walk) {
      const b = getComputedStyle(walk).backgroundColor;
      if (b && b !== 'transparent' && !/rgba\([^)]*,\s*0\s*\)/.test(b)) { bg = b; break; }
      walk = walk.parentElement;
    }
    const hasText = !!el.innerText.trim();
    window.parent?.postMessage({ source: 'builder-preview', type: 'rect', id, rect: { top: r.top, left: r.left, width: r.width, height: r.height }, color, bg, hasText, vw: window.innerWidth, vh: window.innerHeight }, '*');
  }, []);

  useEffect(() => {
    selIdRef.current = state?.selectedId ?? null;
    const raf = requestAnimationFrame(() => postRect());
    return () => cancelAnimationFrame(raf);
  }, [state, postRect]);

  useEffect(() => {
    const h = () => postRect();
    document.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => { document.removeEventListener('scroll', h, true); window.removeEventListener('resize', h); };
  }, [postRect]);

  useEffect(() => {
    if (state?.previewDark === false) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
    // Fast mode suppresses decorative animations and video paint while editing.
    // The document remains identical; only the editor canvas becomes lighter.
    document.documentElement.dataset.previewMode = state?.previewMode ?? 'design';
  }, [state?.previewDark, state?.previewMode]);
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

    // Transient color hint: while the editor's palette is being dragged the
    // picked shade is painted here via a dedicated <style> tag — a plain DOM
    // write, no React re-render. The next full state message (which carries
    // the committed value) clears it. Values are validated because the
    // message listener accepts any origin.
    const hintEl = document.createElement('style');
    document.head.appendChild(hintEl);
    const HINT_PROPS = new Set(['color', 'background', 'border-color']);
    const applyHint = (d: { id?: unknown; css?: unknown; value?: unknown }) => {
      const ok = typeof d.id === 'string' && /^[\w-]+$/.test(d.id)
        && typeof d.css === 'string' && HINT_PROPS.has(d.css)
        && typeof d.value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(d.value);
      hintEl.textContent = ok ? `[data-nid="${d.id}"]{${d.css}:${d.value}!important}` : '';
    };

    let selectedEl: HTMLElement | null = null;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.source !== 'builder-editor') return;
      if (e.data.type === 'dragpoint') { highlightAt(e.data.x as number, e.data.y as number); return; }
      if (e.data.type === 'dropAt') { dropAt(e.data.x as number, e.data.y as number, e.data.nodeType as string); return; }
      if (e.data.type === 'stylehint') { applyHint(e.data); return; }
      if (e.data.type === 'nodeprops' && typeof e.data.id === 'string' && e.data.props && typeof e.data.props === 'object') {
        // Small style/text patches avoid serializing a full BuilderDoc for a
        // single Inspector interaction.
        const id = e.data.id;
        const props = e.data.props as Record<string, string>;
        setState((current) => current ? {
          ...current,
          doc: {
            ...current.doc,
            // Inspector only edits the active page; avoid a full document walk
            // when a project contains many pages.
            pages: current.doc.pages.map((page) => page.id === current.pageId ? { ...page, blocks: updateProps(page.blocks, id, props) } : page),
          },
        } : current);
        return;
      }
      if (e.data.type === 'theme') {
        // Theme CSS is independent from the document tree. Update it directly
        // so selecting a style never remounts the full visual canvas.
        document.documentElement.dataset.themeSwitching = 'true';
        if (themeFadeTimer.current) window.clearTimeout(themeFadeTimer.current);
        setThemeOverride(typeof e.data.themeId === 'string' ? e.data.themeId : null);
        themeFadeTimer.current = window.setTimeout(() => { delete document.documentElement.dataset.themeSwitching; }, 160);
        return;
      }
      if (e.data.type === 'dna') {
        document.documentElement.dataset.dnaId = typeof e.data.dnaId === 'string' ? e.data.dnaId : 'none';
        return;
      }
      if (e.data.type === 'selection') {
        // Selection is a tiny editor-only interaction. Do not replace React
        // state (which would redraw the entire preview document) just to move
        // the canvas outline.
        const id = typeof e.data.id === 'string' ? e.data.id : null;
        if (id && /^[\w-]+$/.test(id)) selectedEl?.classList.remove('b-selected');
        selectedEl = id ? document.querySelector<HTMLElement>(`[data-nid="${id}"]`) : null;
        selectedEl?.classList.add('b-selected');
        return;
      }
      hintEl.textContent = ''; // the full state carries the committed color
      setState(e.data as Incoming);
    };
    window.addEventListener('message', onMsg);
    // tell the editor we're ready to receive state
    window.parent?.postMessage({ source: 'builder-preview', type: 'ready' }, '*');

    // ── Inline text editing: double-click a heading/text to edit in place ──
    let editingEl: HTMLElement | null = null;
    let editingOrig = '';
    const commitEdit = (save: boolean) => {
      const el = editingEl;
      if (!el) return;
      editingEl = null;
      el.contentEditable = 'false';
      el.classList.remove('b-editing');
      const value = el.innerText.replace(/\s+/g, ' ').trim();
      if (!save) { el.innerText = editingOrig; return; }
      if (value !== editingOrig.replace(/\s+/g, ' ').trim()) {
        window.parent?.postMessage({ source: 'builder-preview', type: 'edittext', id: el.getAttribute('data-nid'), prop: el.getAttribute('data-prop'), value }, '*');
      }
    };

    const onClick = (ev: MouseEvent) => {
      // While editing, let clicks place the caret instead of re-selecting.
      if (editingEl && editingEl.contains(ev.target as Node)) return;
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

    const onDbl = (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement | null)?.closest('[data-nid][data-prop]') as HTMLElement | null;
      if (!el) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (editingEl && editingEl !== el) commitEdit(true);
      editingEl = el;
      editingOrig = el.innerText;
      el.contentEditable = 'true';
      el.classList.add('b-editing');
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (!editingEl) return;
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); editingEl.blur(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); commitEdit(false); editingEl?.blur(); editingEl = null; }
    };
    const onFocusOut = (ev: FocusEvent) => { if (editingEl && ev.target === editingEl) commitEdit(true); };
    document.addEventListener('dblclick', onDbl, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusout', onFocusOut, true);

    // Hover affordance: dashed outline + a small type badge on the element under
    // the cursor, so it's obvious what's clickable and where blocks begin.
    // Pure local DOM — no messages, no React re-render.
    const hoverStyle = document.createElement('style');
    hoverStyle.textContent = `
      .b-hover{outline:1px dashed color-mix(in oklab, var(--primary) 65%, transparent)!important;outline-offset:1px;cursor:pointer}
      .b-hovbadge{position:fixed;z-index:2147483000;pointer-events:none;transform:translateY(-100%);background:var(--primary);color:var(--primary-foreground);font:600 10px/1.5 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;padding:1px 6px;border-radius:5px 5px 5px 0;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.28)}
      .b-editing{outline:2px solid var(--primary)!important;outline-offset:2px;border-radius:2px;cursor:text;min-width:1ch}
      .b-selected{outline:2px solid var(--primary)!important;outline-offset:2px;border-radius:3px}
      :root[data-preview-mode="fast"] *, :root[data-preview-mode="fast"] *::before, :root[data-preview-mode="fast"] *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
      :root[data-preview-mode="fast"] video{visibility:hidden!important}
      :root[data-theme-switching="true"] body{opacity:.78;transition:opacity 120ms ease-out}
      body{transition:opacity 120ms ease-out}
    `;
    document.head.appendChild(hoverStyle);
    const badge = document.createElement('div');
    badge.className = 'b-hovbadge';
    badge.style.display = 'none';
    document.body.appendChild(badge);
    let hovEl: HTMLElement | null = null;
    const clearHover = () => {
      if (hovEl) hovEl.classList.remove('b-hover');
      hovEl = null;
      badge.style.display = 'none';
    };
    const onMove = (ev: MouseEvent) => {
      const el = (ev.target as HTMLElement | null)?.closest('[data-nid]') as HTMLElement | null;
      if (el === hovEl) return;
      clearHover();
      if (!el) return;
      hovEl = el;
      el.classList.add('b-hover');
      const type = el.getAttribute('data-node-type') || '';
      badge.textContent = TYPE_LABEL[type] ? trRef.current(TYPE_LABEL[type]) : (type || '—');
      const r = el.getBoundingClientRect();
      badge.style.left = `${Math.max(2, Math.round(r.left))}px`;
      badge.style.top = `${Math.max(13, Math.round(r.top))}px`;
      badge.style.display = '';
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseleave', clearHover, true);
    window.addEventListener('scroll', clearHover, true);

    return () => {
      commitEdit(true);
      window.removeEventListener('message', onMsg);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('dblclick', onDbl, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseleave', clearHover, true);
      window.removeEventListener('scroll', clearHover, true);
      clearTarget();
      clearHover();
      hintEl.remove();
      hoverStyle.remove();
      badge.remove();
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
  const activeThemeId = themeOverride ?? previewDoc.themeId;
  const theme = activeThemeId && activeThemeId !== 'auto' ? getTheme(activeThemeId) : DEFAULT_THEME;

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
      {previewDoc.dnaId && previewDoc.dnaId !== 'none' && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary shadow-lg backdrop-blur">
          🎬 DNA: {previewDoc.dnaId}
        </div>
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
