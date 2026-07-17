'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { listSitesForUser, statsForUser } from '@/lib/sites';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { LazyVideo } from '@/components/media/lazy-video';
import { planFromBrief, composePrompt, STYLE_PRESETS, NEGATIVE_PROMPT, type Section, type StyleId, type PlanItem } from '@/lib/prompt-composer';
import { THEMES, getTheme } from '@/lib/themes';
import siteConfig from '@/data/site.json';
import mediaData from '@/data/media.json';
import { Sparkles, Upload, Wand2, Clapperboard, Copy, Check, Loader2, ArrowRight, ListVideo, Terminal, Palette, ArrowUp, ArrowDown, X, Plus, Eye, RotateCcw, LayoutList, Monitor, Tablet, Smartphone, LayoutTemplate, LayoutDashboard, Image as ImageIcon, Download, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLanding, type LandingContent } from '@/lib/landing';
import { useLocale } from '@/hooks/use-locale';
import { studioDict } from '@/lib/studio-dict';
import { LanguageSwitcher } from '@/components/language-switcher';
import { dashDict } from '@/lib/dashboard-dict';
import { getCurrentUser } from '@/lib/auth';
import { copyToClipboard } from '@/lib/clipboard';

const ALL_BLOCKS = ['hero', 'split', 'cards', 'mosaic', 'sticky', 'background', 'beams', 'marquee'];

const STUDIO_TAB_IDS = ['landing', 'generate', 'images', 'theme', 'content', 'layout', 'config'] as const;
type StudioTab = (typeof STUDIO_TAB_IDS)[number];
const TAB_ICON = { landing: LayoutTemplate, generate: Clapperboard, images: ImageIcon, theme: Palette, content: Wand2, layout: LayoutList, config: Upload } as const;

const DEVICE = { full: '100%', tablet: '820px', mobile: '390px' } as const;
type Device = keyof typeof DEVICE;
// Preview pane width bounds: never wider than 1200px and always leaves the
// tools panel at least ~360px, so neither side can be crushed off-screen.
const clampPaneWidth = (w: number) =>
  Math.max(360, Math.min(1200, w, typeof window !== 'undefined' ? window.innerWidth - 360 : 1200));

type Status = 'idle' | 'running' | 'done' | 'error';
type BatchItem = PlanItem & { state: 'pending' | 'running' | 'done' | 'error'; error?: string };
type StudioContext = {
  role: string;
  superadmin: boolean;
  mode: 'platform' | 'tenant';
  tenant: { id: string; slug: string; name: string } | null;
  canGenerate: boolean;
  video: { limit: number | null; used: number; remaining: number | null };
};
// Tabs a tenant org-admin may use (asset generation + admin-panel theme). The
// platform-only tabs (landing/content/composition/config) stay superadmin-only.
const TENANT_TABS: StudioTab[] = ['generate', 'images', 'theme'];
type LogLine = { line: string; stream: 'stdout' | 'stderr' };
type GenBody = { prompt: string; title: string; section: Section; aspect: string; style?: string; negative?: string };

/**
 * POST to /api/generate and consume the NDJSON stream. Each `log` event is
 * forwarded to `onLog` so the UI can render pipeline output live; the resolved
 * value is the final media entry from the `done` event.
 */
async function streamGenerate(
  body: GenBody,
  onLog: (l: LogLine) => void,
): Promise<{ src: string; srcMp4?: string; poster?: string; aspectRatio?: string; title?: string }> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Non-stream error responses (e.g. 400/500 JSON) — surface them cleanly.
  const ctype = res.headers.get('content-type') || '';
  if (!res.ok && ctype.includes('application/json')) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.detail || 'Generation failed');
  }
  if (!res.body) throw new Error('Empty server response (no stream)');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let entry: { src: string } | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const raw = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!raw) continue;
      let ev: { type: string; line?: string; stream?: 'stdout' | 'stderr'; entry?: { src: string }; error?: string };
      try {
        ev = JSON.parse(raw);
      } catch {
        continue;
      }
      if (ev.type === 'log') onLog({ line: ev.line ?? '', stream: ev.stream ?? 'stdout' });
      else if (ev.type === 'done') entry = ev.entry ?? null;
      else if (ev.type === 'error') throw new Error(ev.error || 'Generation failed');
    }
  }

  if (!entry) throw new Error('Stream ended without a result');
  return entry;
}

const ease = [0.22, 1, 0.36, 1] as const;
const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.5, ease },
};

export default function StudioPage() {
  const { locale } = useLocale();
  const t = studioDict(locale);
  const td = dashDict(locale);
  // Step 1 — brief
  const [brief, setBrief] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<StudioTab>('generate');
  // Role/tenancy context — decides which tabs show and what the preview targets.
  const [ctx, setCtx] = useState<StudioContext | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/studio/context')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setCtx(d as StudioContext); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const isTenant = ctx ? ctx.mode === 'tenant' : false;
  const visibleTabs: StudioTab[] = isTenant ? TENANT_TABS : STUDIO_TAB_IDS.slice();
  // Tenant admins preview their OWN site (read-only); superadmin previews '/'.
  // Null until context loads so the iframe never flashes the platform landing
  // before switching to the tenant site.
  const previewSrc = !ctx ? null : isTenant && ctx.tenant ? `/s/${ctx.tenant.slug}` : '/';
  // If the active tab isn't available in the current mode, snap to the first.
  useEffect(() => {
    if (ctx && !visibleTabs.includes(tab)) setTab(visibleTabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
  const [device, setDevice] = useState<Device>('full');
  const [paneWidth, setPaneWidth] = useState(704); // px width of the right preview pane
  // Below xl the tools panel and the preview don't fit side by side — the
  // toolbar toggle shows one of them full-width instead.
  const [mobileView, setMobileView] = useState<'panel' | 'preview'>('panel');
  const [isResizing, setIsResizing] = useState(false);

  // Landing copy editor (data/landing.json)
  const [landing, setLanding] = useState<LandingContent>(() => getLanding());
  const [landingBusy, setLandingBusy] = useState(false);
  const [landingMsg, setLandingMsg] = useState('');
  const setHero = (k: keyof LandingContent['hero'], v: string) => setLanding((l) => ({ ...l, hero: { ...l.hero, [k]: v } }));
  const setFinal = (k: keyof LandingContent['finalCta'], v: string) => setLanding((l) => ({ ...l, finalCta: { ...l.finalCta, [k]: v } }));
  const setStepsMeta = (k: 'title' | 'subtitle', v: string) => setLanding((l) => ({ ...l, steps: { ...l.steps, [k]: v } }));
  const setFeaturesMeta = (k: 'title' | 'subtitle', v: string) => setLanding((l) => ({ ...l, features: { ...l.features, [k]: v } }));
  const setThemesMeta = (k: 'title' | 'subtitle', v: string) => setLanding((l) => ({ ...l, themesTeaser: { ...l.themesTeaser, [k]: v } }));
  const setStepItem = (i: number, k: 'title' | 'text', v: string) => setLanding((l) => ({ ...l, steps: { ...l.steps, items: l.steps.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) } }));
  const setFeatureItem = (i: number, k: 'title' | 'text', v: string) => setLanding((l) => ({ ...l, features: { ...l.features, items: l.features.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)) } }));
  const saveLanding = async () => {
    setLandingBusy(true);
    setLandingMsg('');
    try {
      const res = await fetch('/api/set-landing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: landing }) });
      const data = await res.json();
      if (res.ok) { setLandingMsg(t.landingSaved); setPreviewKey((k) => k + 1); }
      else setLandingMsg(data.error || t.error);
    } catch { setLandingMsg(t.saveError); }
    finally { setLandingBusy(false); }
  };
  const [openingBuilder, setOpeningBuilder] = useState(false);
  const openBuilder = async () => {
    // A tenant admin should always enter their own site directly; the platform
    // landing is reserved for the superadmin Studio mode.
    if (isTenant && ctx?.tenant?.id) {
      window.location.href = `/studio/builder?site=${encodeURIComponent(ctx.tenant.id)}`;
      return;
    }
    setOpeningBuilder(true);
    try {
      const res = await fetch('/api/landing-site', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.id) {
        window.location.href = `/studio/builder?site=${encodeURIComponent(data.id)}`;
      } else {
        setLandingMsg(data.error || t.cannotOpenBuilder);
        setOpeningBuilder(false);
      }
    } catch {
      setLandingMsg(t.cannotOpenBuilder);
      setOpeningBuilder(false);
    }
  };
  const openLandingInBuilder = openBuilder;

  // Step 2 — the generated prompt + section metadata
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [section, setSection] = useState<Section>('hero');
  const [aspect, setAspect] = useState('16:9');
  const [styleId, setStyleId] = useState<StyleId>('auto');
  const [copied, setCopied] = useState(false);

  // Step 3 — generation
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{ src: string; srcMp4?: string; poster?: string; aspectRatio?: string; title?: string } | null>(null);
  const [error, setError] = useState('');

  // Batch — whole-page plan
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  // Images — free text-to-image (Pollinations) with a persistent gallery
  type ImgEntry = { id: string; title: string; prompt: string; style?: string; aspect: string; src: string; seed: number; createdAt: string };
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgAspect, setImgAspect] = useState('16:9');
  const [imgStyle, setImgStyle] = useState<StyleId>('auto');
  const [imgCount, setImgCount] = useState('2');
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState('');
  const [images, setImages] = useState<ImgEntry[]>([]);
  const imgLoaded = useRef(false);
  const [copiedImg, setCopiedImg] = useState('');

  useEffect(() => {
    if (tab !== 'images' || imgLoaded.current) return;
    imgLoaded.current = true;
    fetch('/api/generate-image')
      .then((r) => r.json())
      .then((d) => setImages(Array.isArray(d.entries) ? d.entries : []))
      .catch(() => {});
  }, [tab]);

  const generateImages = async () => {
    setImgBusy(true);
    setImgError('');
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, aspect: imgAspect, style: imgStyle, count: Number(imgCount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.imgFailed);
      setImages((prev) => [...(data.entries ?? []), ...prev]);
      if (data.partialError) setImgError(data.partialError);
    } catch (e) {
      setImgError(e instanceof Error ? e.message : t.imgFailed);
    } finally {
      setImgBusy(false);
    }
  };

  const deleteImage = async (id: string) => {
    setImages((prev) => prev.filter((e) => e.id !== id));
    await fetch('/api/generate-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const copyImageUrl = async (src: string) => {
    const success = await copyToClipboard(new URL(src, window.location.origin).href);
    if (success) {
      setCopiedImg(src);
      setTimeout(() => setCopiedImg(''), 1500);
    }
  };

  // Site theme
  const [siteTheme, setSiteTheme] = useState<string>('auto');
  const [themeMsg, setThemeMsg] = useState('');
  const [themeBusy, setThemeBusy] = useState(false);

  const suggestTheme = async () => {
    setThemeBusy(true);
    setThemeMsg('');
    try {
      const res = await fetch('/api/pick-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (data.themeId) {
        setSiteTheme(data.themeId);
        setThemeMsg(t.themePicked.replace('{label}', data.label).replace('{via}', data.via === 'llm' ? t.viaLlm : t.viaKeywords));
      }
    } catch {
      setThemeMsg(t.cannotPick);
    } finally {
      setThemeBusy(false);
    }
  };

  const applyTheme = async () => {
    setThemeBusy(true);
    setThemeMsg('');
    try {
      // Tenant admins theme their ADMIN PANEL (org dashboard + members' area),
      // not the platform landing — different endpoint, no platform write.
      const endpoint = isTenant ? '/api/studio/dashboard-theme' : '/api/set-theme';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: siteTheme }),
      });
      const data = await res.json();
      setThemeMsg(res.ok ? t.themeSaved.replace('{theme}', data.theme) : data.error || t.error);
    } catch {
      setThemeMsg(t.saveError);
    } finally {
      setThemeBusy(false);
    }
  };

  // In tenant mode, load the current admin-panel theme so the selector reflects it.
  useEffect(() => {
    if (!isTenant) return;
    fetch('/api/studio/dashboard-theme')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.theme) setSiteTheme(d.theme); })
      .catch(() => {});
  }, [isTenant]);

  // Page builder — ordered block composition
  const savedLayout = (siteConfig as { layout?: string[] | null }).layout;
  const [builderLayout, setBuilderLayout] = useState<string[]>(
    savedLayout && savedLayout.length ? savedLayout : getTheme('auto').layout,
  );
  const [builderMsg, setBuilderMsg] = useState('');
  const [builderBusy, setBuilderBusy] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [addBlock, setAddBlock] = useState<string>('cards');

  const moveBlock = (i: number, dir: -1 | 1) => {
    setBuilderLayout((l) => {
      const j = i + dir;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const dragIndex = useRef<number | null>(null);
  const onDragStart = (i: number) => () => {
    dragIndex.current = i;
  };
  const onDropAt = (i: number) => () => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === i) return;
    setBuilderLayout((l) => {
      const next = [...l];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return next;
    });
  };
  const removeBlock = (i: number) => setBuilderLayout((l) => l.filter((_, idx) => idx !== i));
  const appendBlock = () => setBuilderLayout((l) => [...l, addBlock]);
  const loadFromTheme = () => setBuilderLayout(getTheme(siteTheme).layout);

  const saveLayout = async (reset = false) => {
    setBuilderBusy(true);
    setBuilderMsg('');
    try {
      const res = await fetch('/api/set-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: reset ? null : builderLayout }),
      });
      const data = await res.json();
      if (res.ok) {
        if (reset) setBuilderLayout(getTheme(siteTheme).layout);
        setBuilderMsg(reset ? t.resetToTheme : t.layoutSaved);
        setPreviewKey((k) => k + 1);
      } else {
        setBuilderMsg(data.error || t.error);
      }
    } catch {
      setBuilderMsg(t.saveError);
    } finally {
      setBuilderBusy(false);
    }
  };

  // Content editor — editable text of existing media entries
  type ContentRow = { id: string; section: string; title: string; subtitle: string; ctaLabel: string; ctaHref: string };
  const [content, setContent] = useState<ContentRow[]>(() =>
    (mediaData as Array<Record<string, string>>).map((m) => ({
      id: m.id,
      section: m.section,
      title: m.title ?? '',
      subtitle: m.subtitle ?? '',
      ctaLabel: m.ctaLabel ?? '',
      ctaHref: m.ctaHref ?? '',
    })),
  );
  const [contentBusy, setContentBusy] = useState(false);
  const [contentMsg, setContentMsg] = useState('');
  const setField = (id: string, field: keyof ContentRow, val: string) =>
    setContent((c) => c.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  const removeContent = (id: string) => setContent((c) => c.filter((e) => e.id !== id));
  const contentDrag = useRef<number | null>(null);
  const onContentDragStart = (i: number) => () => {
    contentDrag.current = i;
  };

  const onContentDrop = (i: number) => () => {
    const from = contentDrag.current;
    contentDrag.current = null;
    if (from === null || from === i) return;
    setContent((c) => {
      const next = [...c];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      return next;
    });
  };
  const originalIds = (mediaData as Array<{ id: string }>).map((m) => m.id);

  const saveContent = async () => {
    setContentBusy(true);
    setContentMsg('');
    try {
      const remove = originalIds.filter((id) => !content.some((r) => r.id === id));
      const res = await fetch('/api/set-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: content, order: content.map((r) => r.id), remove }),
      });
      const data = await res.json();
      if (res.ok) {
        setContentMsg(t.contentSaved.replace('{n}', String(data.count)));
        setPreviewKey((k) => k + 1);
      } else {
        setContentMsg(data.error || t.error);
      }
    } catch {
      setContentMsg(t.saveError);
    } finally {
      setContentBusy(false);
    }
  };

  // Export / import full site config
  const cfgFileRef = useRef<HTMLInputElement>(null);
  const [cfgMsg, setCfgMsg] = useState('');
  const importConfig = async (file: File) => {
    setCfgMsg('');
    try {
      const bundle = JSON.parse(await file.text());
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
      const data = await res.json();
      if (res.ok) {
        setCfgMsg(t.imported.replace('{list}', data.imported.join(', ')));
        setTimeout(() => window.location.reload(), 900);
      } else {
        setCfgMsg(data.error || t.error);
      }
    } catch {
      setCfgMsg(t.invalidJson);
    }
  };

  // Live pipeline logs (streamed from /api/generate).
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const appendLog = useCallback((l: LogLine) => setLogs((prev) => [...prev, l]), []);

  // Keep the log view pinned to the newest line.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  // Drag-to-resize the right preview pane: pointer events (mouse + touch +
  // pen), one state write per frame (rAF), and the iframe ignores the pointer
  // while dragging — otherwise it swallows move events and the resize
  // stutters or gets stuck. Listeners are attached only for the drag.
  const startPaneResize = (e: ReactPointerEvent) => {
    e.preventDefault();
    setIsResizing(true);
    let raf = 0;
    let lastX = e.clientX;
    const onMove = (ev: PointerEvent) => {
      lastX = ev.clientX;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setPaneWidth(clampPaneWidth(window.innerWidth - lastX));
      });
    };
    const onUp = () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setIsResizing(false);
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
  // Keep the preview pane within bounds when the window shrinks.
  useEffect(() => {
    const clamp = () => setPaneWidth((w) => clampPaneWidth(w));
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  async function runOne(body: GenBody) {
    return streamGenerate({ negative: NEGATIVE_PROMPT, ...body }, appendLog);
  }

  const planWholePage = () => {
    const plan = planFromBrief(brief, styleId);
    setBatch(plan.map((p) => ({ ...p, state: 'pending' as const })));
  };

  const runBatch = async () => {
    setBatchRunning(true);
    setLogs([]);
    // Parallel queue: N workers pull from a shared cursor; each item is retried
    // a couple of times before being marked failed.
    const CONCURRENCY = 2;
    const RETRIES = 2;
    const items = batch;
    let cursor = 0;

    const worker = async () => {
      while (cursor < items.length) {
        const i = cursor++;
        setBatch((b) => b.map((it, idx) => (idx === i ? { ...it, state: 'running' } : it)));
        let lastErr: unknown = null;
        for (let attempt = 0; attempt <= RETRIES; attempt++) {
          try {
            await runOne({ prompt: items[i].prompt, title: items[i].title, section: items[i].section, aspect: items[i].aspect, style: items[i].style });
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            if (attempt < RETRIES) {
              appendLog({ line: t.retryFailed.replace('{title}', items[i].title).replace('{n}', String(attempt + 1)), stream: 'stderr' });
              await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            }
          }
        }
        setBatch((b) =>
          b.map((it, idx) =>
            idx === i
              ? { ...it, state: lastErr ? 'error' : 'done', error: lastErr instanceof Error ? lastErr.message : undefined }
              : it,
          ),
        );
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    setBatchRunning(false);
  };

  const readFile = useCallback(async (file: File) => {
    const text = await file.text();
    setBrief(text);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile],
  );

  const generatePrompt = () => {
    const plan = planFromBrief(brief, styleId);
    if (plan.length) {
      setPrompt(plan[0].prompt);
      setTitle(plan[0].title);
      setSection(plan[0].section);
      setAspect(plan[0].aspect);
    } else {
      setPrompt(composePrompt({ brief, section, style: styleId }));
    }
  };

  const copyPrompt = async () => {
    const success = await copyToClipboard(prompt);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const create = async () => {
    setStatus('running');
    setError('');
    setResult(null);
    setLogs([]);
    try {
      const entry = await streamGenerate({ prompt, title, section, aspect, style: styleId, negative: NEGATIVE_PROMPT }, appendLog);
      setResult(entry);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  };

  const hasPrompt = prompt.trim().length > 0;

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[120rem] items-center gap-1.5 px-2 sm:gap-2 sm:px-4 xl:gap-3">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-bold tracking-tight" title={td.dashboard}>
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="hidden md:inline">{td.dashboard}</span>
          </Link>
          <div className="mx-1 hidden h-6 w-px bg-border md:block xl:mx-2" />
          <span className="hidden min-w-0 truncate text-sm text-muted-foreground lg:inline">{t.headerSub}</span>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Below xl the panel and preview can't sit side by side — toggle between them. */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 xl:hidden">
              {(['panel', 'preview'] as const).map((v) => {
                const Icon = v === 'panel' ? PanelLeft : Eye;
                const label = v === 'panel' ? t.tabs[tab] : t.preview;
                return (
                  <button key={v} onClick={() => setMobileView(v)} className={`rounded-md p-1.5 transition-colors ${mobileView === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label={label} title={label}>
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
            <Button size="sm" onClick={openLandingInBuilder} disabled={openingBuilder} className="gap-1.5 px-2 md:px-3" aria-label={t.builderBtn} title={t.builderBtn}>
              {openingBuilder ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutList className="h-4 w-4" />} <span className="hidden md:inline">{t.builderBtn}</span>
            </Button>
            <Link href="/" className="hidden sm:block">
              <Button size="sm" variant="outline" className="gap-1.5 px-2 md:px-3" aria-label={t.toHome} title={t.toHome}><span className="hidden md:inline">{t.toHome}</span> <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left tools panel — scrollable */}
        <aside className={cn('min-w-0 flex-1 overflow-y-auto', mobileView === 'preview' && 'hidden xl:block')}>
          <div className="mx-auto max-w-3xl space-y-5 px-5 py-6">
        <motion.header {...fade} className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {t.studioBadge}
          </span>
          <span className="text-sm text-muted-foreground">{t.tabs[tab]}</span>
        </motion.header>
        {/* Tab bar (rendered only once role context is known, so the full set
            never flashes before collapsing to the tenant subset). */}
        {ctx && (
        <div className="sticky top-0 z-20 -mx-5 mb-2 border-b border-border/60 bg-background/85 px-5 pb-px backdrop-blur-md">
          <div className="flex flex-wrap gap-1">
            {visibleTabs.map((id) => {
              const Icon = TAB_ICON[id];
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon className="h-4 w-4" /> {t.tabs[id]}
                  {active && <motion.span layoutId="studio-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>
        )}
        {/* Landing editor */}
        {tab === 'landing' && (
        <motion.section {...fade} className="space-y-4">
          {/* Full visual builder — dedicated to this landing */}
          <Card className="relative overflow-hidden border-primary/40 p-4 @container">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'radial-gradient(70% 120% at 100% 0%, var(--primary), transparent 60%)' }} />
            <div className="relative flex flex-col gap-3 @md:flex-row @md:items-center">
              <div className="min-w-0 @md:flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold"><LayoutTemplate className="h-4 w-4 shrink-0 text-primary" /> <span className="text-balance">{t.landingBuilderTitle}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{t.landingBuilderDesc}</p>
              </div>
              <Button onClick={openLandingInBuilder} disabled={openingBuilder} className="gap-1.5 self-start @md:self-auto">
                {openingBuilder ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t.openLandingBuilder}
              </Button>
            </div>
          </Card>
          <p className="text-[11px] text-muted-foreground">{t.quickEditHint}</p>
          {/* Hero */}
          <Card className="space-y-2.5 p-4">
            <p className="text-sm font-semibold">{t.hero}</p>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t.badge}</label>
              <Input value={landing.hero.badge} onChange={(e) => setHero('badge', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t.heading}</label>
              <Textarea value={landing.hero.title} onChange={(e) => setHero('title', e.target.value)} rows={2} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">{t.subheading}</label>
              <Textarea value={landing.hero.subtitle} onChange={(e) => setHero('subtitle', e.target.value)} rows={3} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={landing.hero.ctaPrimaryLabel} onChange={(e) => setHero('ctaPrimaryLabel', e.target.value)} placeholder={t.btn1Label} />
              <Input value={landing.hero.ctaPrimaryHref} onChange={(e) => setHero('ctaPrimaryHref', e.target.value)} placeholder={t.btn1Href} />
              <Input value={landing.hero.ctaSecondaryLabel} onChange={(e) => setHero('ctaSecondaryLabel', e.target.value)} placeholder={t.btn2Label} />
              <Input value={landing.hero.ctaSecondaryHref} onChange={(e) => setHero('ctaSecondaryHref', e.target.value)} placeholder={t.btn2Href} />
            </div>
            <Input value={landing.hero.note} onChange={(e) => setHero('note', e.target.value)} placeholder={t.noteUnderButtons} />
          </Card>

          {/* Steps */}
          <Card className="space-y-2.5 p-4">
            <p className="text-sm font-semibold">{t.howItWorks}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={landing.steps.title} onChange={(e) => setStepsMeta('title', e.target.value)} placeholder={t.sectionTitle} />
              <Input value={landing.steps.subtitle} onChange={(e) => setStepsMeta('subtitle', e.target.value)} placeholder={t.sectionSubtitle} />
            </div>
            {landing.steps.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-2.5">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">{t.step} {it.n}</span>
                <Input className="mt-1" value={it.title} onChange={(e) => setStepItem(i, 'title', e.target.value)} placeholder={t.titleph} />
                <Textarea className="mt-1.5" rows={2} value={it.text} onChange={(e) => setStepItem(i, 'text', e.target.value)} placeholder={t.textPh} />
              </div>
            ))}
          </Card>

          {/* Features */}
          <Card className="space-y-2.5 p-4">
            <p className="text-sm font-semibold">{t.features}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={landing.features.title} onChange={(e) => setFeaturesMeta('title', e.target.value)} placeholder={t.sectionTitle} />
              <Input value={landing.features.subtitle} onChange={(e) => setFeaturesMeta('subtitle', e.target.value)} placeholder={t.sectionSubtitle} />
            </div>
            {landing.features.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-2.5">
                <Input value={it.title} onChange={(e) => setFeatureItem(i, 'title', e.target.value)} placeholder={t.titleph} />
                <Textarea className="mt-1.5" rows={2} value={it.text} onChange={(e) => setFeatureItem(i, 'text', e.target.value)} placeholder={t.textPh} />
              </div>
            ))}
          </Card>

          {/* Themes teaser + Final CTA */}
          <Card className="space-y-2.5 p-4">
            <p className="text-sm font-semibold">{t.themesBlock}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={landing.themesTeaser.title} onChange={(e) => setThemesMeta('title', e.target.value)} placeholder={t.titleph} />
              <Input value={landing.themesTeaser.subtitle} onChange={(e) => setThemesMeta('subtitle', e.target.value)} placeholder={t.sectionSubtitle} />
            </div>
          </Card>
          <Card className="space-y-2.5 p-4">
            <p className="text-sm font-semibold">{t.finalCta}</p>
            <Input value={landing.finalCta.title} onChange={(e) => setFinal('title', e.target.value)} placeholder={t.titleph} />
            <Textarea rows={2} value={landing.finalCta.subtitle} onChange={(e) => setFinal('subtitle', e.target.value)} placeholder={t.sectionSubtitle} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={landing.finalCta.ctaPrimaryLabel} onChange={(e) => setFinal('ctaPrimaryLabel', e.target.value)} placeholder={t.btn1Label} />
              <Input value={landing.finalCta.ctaPrimaryHref} onChange={(e) => setFinal('ctaPrimaryHref', e.target.value)} placeholder={t.btn1Href} />
              <Input value={landing.finalCta.ctaSecondaryLabel} onChange={(e) => setFinal('ctaSecondaryLabel', e.target.value)} placeholder={t.btn2Label} />
              <Input value={landing.finalCta.ctaSecondaryHref} onChange={(e) => setFinal('ctaSecondaryHref', e.target.value)} placeholder={t.btn2Href} />
            </div>
          </Card>

          <div className="sticky bottom-0 flex items-center gap-2 bg-background/90 py-2 backdrop-blur">
            <Button size="sm" onClick={saveLanding} disabled={landingBusy} className="gap-1.5">
              {landingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.saveLanding}
            </Button>
            {landingMsg && <span className="text-xs text-muted-foreground">{landingMsg}</span>}
          </div>
        </motion.section>
        )}

        {/* Step 1 — Brief */}
        {tab === 'generate' && (
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.05 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">1</span>
            {t.briefLabel}
          </label>
          <Card
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`group relative transition-all ${dragOver ? 'border-primary ring-4 ring-primary/20' : ''}`}
          >
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={5}
              placeholder={t.briefPlaceholder}
              className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
            />
            <div className="flex flex-col items-start justify-between gap-3 sm:gap-2 border-t border-border/60 p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-3.5 w-3.5" /> {t.uploadMd}
              </Button>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={styleId} onValueChange={(v) => setStyleId(v as StyleId)}>
                  <SelectTrigger className="w-52 gap-1.5"><Palette className="h-4 w-4 opacity-60" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.styleAuto}</SelectItem>
                    {STYLE_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={planWholePage} disabled={!brief.trim()} className="gap-1.5">
                  <ListVideo className="h-4 w-4" /> {t.buildWholePage}
                </Button>
                <Button size="sm" onClick={generatePrompt} disabled={!brief.trim()} className="gap-1.5">
                  <Wand2 className="h-4 w-4" /> {t.onePrompt}
                </Button>
              </div>
            </div>
          </Card>
        </motion.section>
        )}

        {/* Image generator — free, no API key */}
        {tab === 'images' && (
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.05 }} className="mb-6 space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-primary" /> {t.imgSectionTitle}
            </label>
            <Card>
              <Textarea
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                rows={3}
                placeholder={t.imgPromptPh}
                className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-3">
                <Select value={imgStyle} onValueChange={(v) => setImgStyle(v as StyleId)}>
                  <SelectTrigger className="w-52 gap-1.5"><Palette className="h-4 w-4 opacity-60" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t.styleAuto}</SelectItem>
                    {STYLE_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={imgAspect} onValueChange={setImgAspect}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['16:9', '9:16', '1:1', '4:3', '3:2'].map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={imgCount} onValueChange={setImgCount}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4'].map((n) => (
                      <SelectItem key={n} value={n}>×{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={generateImages} disabled={imgBusy || !imgPrompt.trim()} className="ml-auto gap-1.5">
                  {imgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {imgBusy ? t.imgGenerating : t.imgGenerate}
                </Button>
              </div>
            </Card>
            <p className="mt-2 text-[11px] text-muted-foreground">{t.imgFreeNote}</p>
          </div>

          {imgError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
              <p className="font-semibold text-red-500">{t.imgFailed}</p>
              <p className="mt-1 text-xs text-muted-foreground">{imgError}</p>
            </div>
          )}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-primary" /> {t.imgGallery}
            </label>
            {images.length === 0 && !imgBusy ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t.imgEmpty}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {imgBusy && Array.from({ length: Number(imgCount) }, (_, i) => (
                  <div key={`skeleton-${i}`} className="flex aspect-video animate-pulse items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                  </div>
                ))}
                {images.map((img) => (
                  <motion.div key={img.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="group overflow-hidden rounded-xl border border-border/60 bg-card/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.title} loading="lazy" className="w-full object-cover" style={{ aspectRatio: img.aspect.replace(':', ' / ') }} />
                    <div className="flex items-center gap-1 p-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={img.prompt}>{img.title}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyImageUrl(img.src)} aria-label={t.copy} title={copiedImg === img.src ? t.imgCopied : t.copy}>
                        {copiedImg === img.src ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <a href={img.src} download aria-label={t.imgDownload} title={t.imgDownload}>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                      </a>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteImage(img.id)} aria-label={t.imgDelete} title={t.imgDelete}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">{t.imgUseHint}</p>
          </div>
        </motion.section>
        )}

        {/* Site theme */}
        {tab === 'theme' && (
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.08 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4 text-primary" /> {t.siteTheme}
          </label>
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <Select value={siteTheme} onValueChange={setSiteTheme}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t.themeAuto}</SelectItem>
                {THEMES.map((th) => (
                  <SelectItem key={th.id} value={th.id}>{th.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={suggestTheme} disabled={themeBusy || !brief.trim()} className="gap-1.5">
              <Wand2 className="h-4 w-4" /> {t.suggestByBrief}
            </Button>
            <Button size="sm" onClick={applyTheme} disabled={themeBusy} className="gap-1.5">
              {themeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.applyToSite}
            </Button>
            {themeMsg && <span className="text-xs text-muted-foreground">{themeMsg}</span>}
          </Card>
        </motion.section>
        )}

        {/* Content editor */}
        {tab === 'content' && (
        <>
        {content.length > 0 && (
          <motion.section {...fade} transition={{ ...fade.transition, delay: 0.085 }} className="mb-6">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="h-4 w-4 text-primary" /> {t.sectionContent}
            </label>
            <Card className="space-y-3 p-3">
              {content.map((row, i) => (
                <div
                  key={row.id}
                  draggable
                  onDragStart={onContentDragStart(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onContentDrop(i)}
                  className="rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="cursor-grab text-muted-foreground/60 active:cursor-grabbing" aria-hidden>⋮⋮</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{row.section}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{row.id}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeContent(row.id)} aria-label={t.deleteSection}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={row.title} onChange={(e) => setField(row.id, 'title', e.target.value)} placeholder={t.titleph} />
                    <Input value={row.subtitle} onChange={(e) => setField(row.id, 'subtitle', e.target.value)} placeholder={t.subheading} />
                    {row.section === 'hero' && (
                      <>
                        <Input value={row.ctaLabel} onChange={(e) => setField(row.id, 'ctaLabel', e.target.value)} placeholder={t.ctaLabelPh} />
                        <Input value={row.ctaHref} onChange={(e) => setField(row.id, 'ctaHref', e.target.value)} placeholder={t.ctaHrefPh} />
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveContent} disabled={contentBusy} className="gap-1.5">
                  {contentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.saveContent}
                </Button>
                {contentMsg && <span className="text-xs text-muted-foreground">{contentMsg}</span>}
              </div>
            </Card>
          </motion.section>
        )}
        {content.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t.noContent}</p>
        )}
        </>
        )}

        {/* Page builder */}
        {tab === 'layout' && (
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.09 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <LayoutList className="h-4 w-4 text-primary" /> {t.pageBuilder}
          </label>
          <Card className="p-3">
            <div className="space-y-2">
              {builderLayout.map((block, i) => (
                <div
                  key={`${block}-${i}`}
                  draggable
                  onDragStart={onDragStart(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDropAt(i)}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-2.5"
                >
                  <span className="cursor-grab text-muted-foreground/60 active:cursor-grabbing" aria-hidden>⋮⋮</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.blockLabels[block] ?? block}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label={t.up}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveBlock(i, 1)} disabled={i === builderLayout.length - 1} aria-label={t.down}><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => removeBlock(i)} aria-label={t.remove}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {builderLayout.length === 0 && (
                <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{t.noBlocks}</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <Select value={addBlock} onValueChange={setAddBlock}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_BLOCKS.map((b) => (
                    <SelectItem key={b} value={b}>{t.blockLabels[b]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={appendBlock} className="gap-1.5"><Plus className="h-4 w-4" /> {t.add}</Button>
              <Button size="sm" variant="outline" onClick={loadFromTheme} className="gap-1.5"><RotateCcw className="h-4 w-4" /> {t.fromTheme}</Button>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => saveLayout(true)} disabled={builderBusy}>{t.reset}</Button>
                <Button size="sm" onClick={() => saveLayout(false)} disabled={builderBusy} className="gap-1.5">
                  {builderBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.save}
                </Button>
              </div>
              {builderMsg && <span className="w-full text-xs text-muted-foreground">{builderMsg}</span>}
            </div>
          </Card>
        </motion.section>
        )}

        {/* Site config export / import */}
        {tab === 'config' && (
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.11 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Upload className="h-4 w-4 text-primary" /> {t.siteConfig}
          </label>
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <a href="/api/export">
              <Button size="sm" variant="outline" className="gap-1.5"><ArrowDown className="h-4 w-4" /> {t.exportJson}</Button>
            </a>
            <Button size="sm" variant="outline" onClick={() => cfgFileRef.current?.click()} className="gap-1.5">
              <Upload className="h-4 w-4" /> {t.importJson}
            </Button>
            <input ref={cfgFileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])} />
            {cfgMsg && <span className="text-xs text-muted-foreground">{cfgMsg}</span>}
          </Card>
        </motion.section>
        )}

        {/* Batch plan — whole page */}
        {tab === 'generate' && (
        <>
        <AnimatePresence>
          {batch.length > 0 && (
            <motion.section {...fade} className="mb-6">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">★</span>
                {t.planTitle.replace('{n}', String(batch.length))}
              </label>
              <Card className="space-y-2 p-3">
                {batch.map((it, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{it.section}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{it.prompt}</p>
                    </div>
                    <span className="shrink-0">
                      {it.state === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {it.state === 'done' && <Check className="h-4 w-4 text-green-500" />}
                      {it.state === 'error' && <span className="text-xs text-red-500" title={it.error}>{t.stateError}</span>}
                      {it.state === 'pending' && <span className="text-xs text-muted-foreground/60">{t.stateQueued}</span>}
                    </span>
                  </motion.div>
                ))}
                <div className="pt-1">
                  <Button onClick={runBatch} disabled={batchRunning} className="w-full gap-2">
                    {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
                    {batchRunning ? t.generatingSections : t.generateAll}
                  </Button>
                  <Link href="/" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">{t.afterReady}</Link>
                </div>
                {batchRunning && logs.length > 0 && (
                  <div className="mt-1">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Terminal className="h-3.5 w-3.5" /> {t.pipelineLogs}
                    </div>
                    <div
                      ref={logRef}
                      className="max-h-56 overflow-auto rounded-xl border border-border bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-green-300"
                    >
                      {logs.map((l, i) => (
                        <div key={i} className={l.stream === 'stderr' ? 'text-amber-300/90' : ''}>
                          {l.line || '\u00a0'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 2 — Generated prompt */}
        <AnimatePresence mode="wait">
          {hasPrompt && (
            <motion.section key="prompt" {...fade} className="mb-6">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">2</span>
                {t.promptTitle}
              </label>
              <Card className="relative overflow-hidden p-1">
                {/* animated gradient sheen */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{ background: 'linear-gradient(110deg, transparent 30%, var(--primary), transparent 70%)' }}
                  animate={{ x: ['-120%', '120%'] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <div className="flex flex-wrap items-center gap-2 p-3 pt-0">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t.titlePh}
                      className="flex-1 min-w-[8rem]"
                    />
                    <Select value={section} onValueChange={(v) => setSection(v as Section)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hero">hero</SelectItem>
                        <SelectItem value="background">background</SelectItem>
                        <SelectItem value="card">card</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={aspect} onValueChange={setAspect}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={copyPrompt} className="gap-1.5">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />} {t.copy}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3 — Create */}
        <AnimatePresence mode="wait">
          {hasPrompt && (
            <motion.section key="create" {...fade} className="text-center">
              <Button
                size="lg"
                onClick={create}
                disabled={status === 'running'}
                className="gap-2"
              >
                {status === 'running' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clapperboard className="h-5 w-5" />}
                {status === 'running' ? t.creatingVideo : t.createVideo}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                {t.needKey1} <code>MUAPI_KEY</code> {t.needKey2} <code>.env.local</code>.
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Progress / Result */}
        <AnimatePresence>
          {status === 'running' && (
            <motion.div {...fade} className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" /> {t.genOptimizing}</div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-primary" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '40%' }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t.renderNote}</p>
              {logs.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Terminal className="h-3.5 w-3.5" /> {t.pipelineLogs}
                  </div>
                  <div
                    ref={logRef}
                    className="max-h-56 overflow-auto rounded-xl border border-border bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-green-300"
                  >
                    {logs.map((l, i) => (
                      <div key={i} className={l.stream === 'stderr' ? 'text-amber-300/90' : ''}>
                        {l.line || '\u00a0'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {status === 'done' && result && (
            <motion.div {...fade} className="mt-8 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-500"><Check className="h-4 w-4" /> {t.doneClip}</div>
              <LazyVideo src={result.src} srcMp4={result.srcMp4} poster={result.poster} ratio={result.aspectRatio} className="w-full rounded-xl" />
              <div className="mt-4 flex items-center justify-between">
                <p className="truncate text-sm font-medium">{result.title}</p>
                <Link href="/"><Button size="sm" variant="outline" className="gap-1.5">{t.toHome} <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div {...fade} className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
              <p className="font-semibold text-red-500">{t.genFailed}</p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{error}</pre>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
          </div>
        </aside>

        {/* Live preview — right pane (fixed --pw width from xl up), full-width
            below xl via the toolbar toggle. */}
        <div
          className={cn(
            'relative min-w-0 flex-1 flex-col bg-muted/20 @container xl:w-(--pw) xl:flex-none xl:shrink-0 xl:border-l xl:border-border/60',
            mobileView === 'panel' ? 'hidden xl:flex' : 'flex',
          )}
          style={{ '--pw': `${paneWidth}px` } as CSSProperties}
        >
          {/* drag handle (desktop only; the touch target extends 6px to each side) */}
          <div
            onPointerDown={startPaneResize}
            className={cn(
              "absolute left-0 top-0 z-20 hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize touch-none transition-colors after:absolute after:inset-y-0 after:-left-1.5 after:-right-1.5 after:content-[''] hover:bg-primary/40 xl:block",
              isResizing && 'bg-primary/40',
            )}
            title={t.resizeHint}
          />
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs text-muted-foreground @lg:px-4">
            <Eye className="h-4 w-4 shrink-0 text-primary" />
            <span className="hidden truncate @md:inline">{t.preview}</span>
            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5 @md:ml-2">
              {(['full', 'tablet', 'mobile'] as const).map((dv) => {
                const Icon = dv === 'full' ? Monitor : dv === 'tablet' ? Tablet : Smartphone;
                return (
                  <button key={dv} onClick={() => setDevice(dv)} className={`rounded-md p-1.5 transition-colors ${device === dv ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} aria-label={dv} title={dv}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link href={previewSrc ?? '/'} target="_blank" className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted">{t.open}</Link>
              <button onClick={() => setPreviewKey((k) => k + 1)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted" title={t.refresh} aria-label={t.refresh}>
                <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden @xl:inline">{t.refresh}</span>
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2 @lg:p-4">
            <div className="mx-auto h-full transition-[width] duration-300" style={{ width: DEVICE[device] }}>
              {previewSrc ? (
                <iframe key={previewKey} src={previewSrc} title={t.previewTitle} className={cn('h-full w-full rounded-xl border border-border bg-background shadow-2xl', isResizing && 'pointer-events-none')} />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-background">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
