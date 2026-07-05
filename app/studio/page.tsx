'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
import { Sparkles, Upload, Wand2, Clapperboard, Copy, Check, Loader2, ArrowRight, ListVideo, Terminal, Palette, ArrowUp, ArrowDown, X, Plus, Eye, RotateCcw, LayoutList } from 'lucide-react';

const BLOCK_LABELS: Record<string, string> = {
  hero: 'Герой',
  split: 'Сплит (видео+текст)',
  cards: 'Карточки',
  mosaic: 'Мозаика',
  sticky: 'Sticky-история',
  background: 'Фон-секция',
  beams: 'Beams-баннер',
  marquee: 'Бегущая строка',
};
const ALL_BLOCKS = Object.keys(BLOCK_LABELS);

type Status = 'idle' | 'running' | 'done' | 'error';
type BatchItem = PlanItem & { state: 'pending' | 'running' | 'done' | 'error'; error?: string };
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
  if (!res.body) throw new Error('Пустой ответ сервера (нет потока)');

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

  if (!entry) throw new Error('Поток завершился без результата');
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
  // Step 1 — brief
  const [brief, setBrief] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        setThemeMsg(`Подобрано: ${data.label} (${data.via === 'llm' ? 'LLM' : 'по ключевым словам'})`);
      }
    } catch {
      setThemeMsg('Не удалось подобрать');
    } finally {
      setThemeBusy(false);
    }
  };

  const applyTheme = async () => {
    setThemeBusy(true);
    setThemeMsg('');
    try {
      const res = await fetch('/api/set-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: siteTheme }),
      });
      const data = await res.json();
      setThemeMsg(res.ok ? `Тема сайта сохранена: ${data.theme}` : data.error || 'Ошибка');
    } catch {
      setThemeMsg('Ошибка сохранения');
    } finally {
      setThemeBusy(false);
    }
  };

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
        setBuilderMsg(reset ? 'Сброшено к теме' : 'Композиция сохранена');
        setPreviewKey((k) => k + 1);
      } else {
        setBuilderMsg(data.error || 'Ошибка');
      }
    } catch {
      setBuilderMsg('Ошибка сохранения');
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
        setContentMsg(`Сохранено секций: ${data.count}`);
        setPreviewKey((k) => k + 1);
      } else {
        setContentMsg(data.error || 'Ошибка');
      }
    } catch {
      setContentMsg('Ошибка сохранения');
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
        setCfgMsg(`Импортировано: ${data.imported.join(', ')} — перезагрузка…`);
        setTimeout(() => window.location.reload(), 900);
      } else {
        setCfgMsg(data.error || 'Ошибка');
      }
    } catch {
      setCfgMsg('Некорректный JSON-файл');
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
              appendLog({ line: `[retry] «${items[i].title}»: попытка ${attempt + 1} не удалась, повтор…`, stream: 'stderr' });
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
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
    <main className="relative min-h-dvh">
      <header className="relative z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[110rem] items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <Clapperboard className="h-5 w-5 text-primary" />
            <span>Студия</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button size="sm" variant="outline" className="gap-1.5">На главную <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Animated aurora background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 h-[42rem] w-[42rem] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, var(--primary), transparent 60%)', filter: 'blur(80px)' }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-40 top-40 h-[36rem] w-[36rem] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, oklch(0.7 0.17 200), transparent 60%)', filter: 'blur(90px)' }}
          animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mx-auto max-w-[110rem] px-4 py-10 sm:px-8">
        <motion.header {...fade} className="mb-8 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Cinematic Studio
          </span>
          <h1 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Опишите идею — получите кино
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Напишите бриф или перетащите <code>.md</code>. Студия соберёт кинематографический промпт,
            а затем сгенерирует и оптимизирует видео для секции сайта.
          </p>
        </motion.header>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_46rem] xl:items-start">
          <div className="min-w-0 space-y-6">
        {/* Step 1 — Brief */}
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.05 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">1</span>
            Бриф или .md
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
              placeholder="Напр.: Кофейный бренд. Пар над свежим эспрессо, тёплый утренний свет. Секции: пуровер, латте-арт, обжарка зёрен."
              className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
            />
            <div className="flex flex-col items-start justify-between gap-3 sm:gap-2 border-t border-border/60 p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-3.5 w-3.5" /> Загрузить .md
              </Button>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={styleId} onValueChange={(v) => setStyleId(v as StyleId)}>
                  <SelectTrigger className="w-52 gap-1.5"><Palette className="h-4 w-4 opacity-60" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Авто (по брифу)</SelectItem>
                    {STYLE_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={planWholePage} disabled={!brief.trim()} className="gap-1.5">
                  <ListVideo className="h-4 w-4" /> Собрать всю страницу
                </Button>
                <Button size="sm" onClick={generatePrompt} disabled={!brief.trim()} className="gap-1.5">
                  <Wand2 className="h-4 w-4" /> Один промпт
                </Button>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Site theme */}
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.08 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4 text-primary" /> Тема сайта
          </label>
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <Select value={siteTheme} onValueChange={setSiteTheme}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Авто (по контенту)</SelectItem>
                {THEMES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={suggestTheme} disabled={themeBusy || !brief.trim()} className="gap-1.5">
              <Wand2 className="h-4 w-4" /> Подобрать по брифу
            </Button>
            <Button size="sm" onClick={applyTheme} disabled={themeBusy} className="gap-1.5">
              {themeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Применить к сайту
            </Button>
            {themeMsg && <span className="text-xs text-muted-foreground">{themeMsg}</span>}
          </Card>
        </motion.section>

        {/* Content editor */}
        {content.length > 0 && (
          <motion.section {...fade} transition={{ ...fade.transition, delay: 0.085 }} className="mb-6">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="h-4 w-4 text-primary" /> Контент секций
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
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeContent(row.id)} aria-label="Удалить секцию"><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={row.title} onChange={(e) => setField(row.id, 'title', e.target.value)} placeholder="Заголовок" />
                    <Input value={row.subtitle} onChange={(e) => setField(row.id, 'subtitle', e.target.value)} placeholder="Подзаголовок" />
                    {row.section === 'hero' && (
                      <>
                        <Input value={row.ctaLabel} onChange={(e) => setField(row.id, 'ctaLabel', e.target.value)} placeholder="Текст кнопки (CTA)" />
                        <Input value={row.ctaHref} onChange={(e) => setField(row.id, 'ctaHref', e.target.value)} placeholder="Ссылка кнопки (/...)" />
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveContent} disabled={contentBusy} className="gap-1.5">
                  {contentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Сохранить контент
                </Button>
                {contentMsg && <span className="text-xs text-muted-foreground">{contentMsg}</span>}
              </div>
            </Card>
          </motion.section>
        )}

        {/* Page builder */}
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.09 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <LayoutList className="h-4 w-4 text-primary" /> Конструктор страницы
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{BLOCK_LABELS[block] ?? block}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label="Вверх"><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveBlock(i, 1)} disabled={i === builderLayout.length - 1} aria-label="Вниз"><ArrowDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => removeBlock(i)} aria-label="Удалить"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {builderLayout.length === 0 && (
                <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Нет блоков — добавьте ниже.</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <Select value={addBlock} onValueChange={setAddBlock}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_BLOCKS.map((b) => (
                    <SelectItem key={b} value={b}>{BLOCK_LABELS[b]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={appendBlock} className="gap-1.5"><Plus className="h-4 w-4" /> Добавить</Button>
              <Button size="sm" variant="outline" onClick={loadFromTheme} className="gap-1.5"><RotateCcw className="h-4 w-4" /> Из темы</Button>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => saveLayout(true)} disabled={builderBusy}>Сброс</Button>
                <Button size="sm" onClick={() => saveLayout(false)} disabled={builderBusy} className="gap-1.5">
                  {builderBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Сохранить
                </Button>
              </div>
              {builderMsg && <span className="w-full text-xs text-muted-foreground">{builderMsg}</span>}
            </div>
          </Card>
        </motion.section>

        {/* Site config export / import */}
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.11 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Upload className="h-4 w-4 text-primary" /> Конфигурация сайта
          </label>
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <a href="/api/export">
              <Button size="sm" variant="outline" className="gap-1.5"><ArrowDown className="h-4 w-4" /> Экспорт JSON</Button>
            </a>
            <Button size="sm" variant="outline" onClick={() => cfgFileRef.current?.click()} className="gap-1.5">
              <Upload className="h-4 w-4" /> Импорт JSON
            </Button>
            <input ref={cfgFileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])} />
            {cfgMsg && <span className="text-xs text-muted-foreground">{cfgMsg}</span>}
          </Card>
        </motion.section>

        {/* Batch plan — whole page */}
        <AnimatePresence>
          {batch.length > 0 && (
            <motion.section {...fade} className="mb-6">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">★</span>
                План страницы — {batch.length} секц.
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
                      {it.state === 'error' && <span className="text-xs text-red-500" title={it.error}>ошибка</span>}
                      {it.state === 'pending' && <span className="text-xs text-muted-foreground/60">в очереди</span>}
                    </span>
                  </motion.div>
                ))}
                <div className="pt-1">
                  <Button onClick={runBatch} disabled={batchRunning} className="w-full gap-2">
                    {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
                    {batchRunning ? 'Генерируем секции…' : 'Сгенерировать все секции'}
                  </Button>
                  <Link href="/" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">После готовности — открыть главную →</Link>
                </div>
                {batchRunning && logs.length > 0 && (
                  <div className="mt-1">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Terminal className="h-3.5 w-3.5" /> Логи пайплайна
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
                Кинематографический промпт
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
                      placeholder="Заголовок"
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
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />} Копировать
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
                {status === 'running' ? 'Создаём видео…' : 'Создать видео'}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Нужен <code>MUAPI_KEY</code> в <code>.env.local</code>. Без ключа используйте CLI с <code>--from</code>.
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Progress / Result */}
        <AnimatePresence>
          {status === 'running' && (
            <motion.div {...fade} className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Генерация и оптимизация…</div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-primary" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '40%' }} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Видео-модели рендерят от 1 до нескольких минут — окно можно не закрывать.</p>
              {logs.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Terminal className="h-3.5 w-3.5" /> Логи пайплайна
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
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-500"><Check className="h-4 w-4" /> Готово — клип добавлен на сайт</div>
              <LazyVideo src={result.src} srcMp4={result.srcMp4} poster={result.poster} ratio={result.aspectRatio} className="w-full rounded-xl" />
              <div className="mt-4 flex items-center justify-between">
                <p className="truncate text-sm font-medium">{result.title}</p>
                <Link href="/"><Button size="sm" variant="outline" className="gap-1.5">На главную <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div {...fade} className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
              <p className="font-semibold text-red-500">Не удалось сгенерировать</p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{error}</pre>
            </motion.div>
          )}
        </AnimatePresence>
          </div>

          {/* Live preview — sticky right pane */}
          <div className="xl:sticky xl:top-20 xl:self-start">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Предпросмотр</span>
              <button onClick={() => setPreviewKey((k) => k + 1)} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Обновить
              </button>
            </div>
            <Card className="overflow-hidden p-0">
              <iframe key={previewKey} src="/" title="Предпросмотр сайта" className="h-[calc(100vh-9rem)] w-full border-0 bg-background" />
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
