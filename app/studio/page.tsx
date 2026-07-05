'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LazyVideo } from '@/components/media/lazy-video';
import { planFromBrief, composePrompt, type Section, type PlanItem } from '@/lib/prompt-composer';
import { Sparkles, Upload, Wand2, Clapperboard, Copy, Check, Loader2, ArrowRight, ListVideo } from 'lucide-react';

type Status = 'idle' | 'running' | 'done' | 'error';
type BatchItem = PlanItem & { state: 'pending' | 'running' | 'done' | 'error'; error?: string };

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
  const [copied, setCopied] = useState(false);

  // Step 3 — generation
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{ src: string; poster?: string; aspectRatio?: string; title?: string } | null>(null);
  const [error, setError] = useState('');

  // Batch — whole-page plan
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  async function runOne(body: { prompt: string; title: string; section: Section; aspect: string }) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || data.detail || 'Generation failed');
    return data.entry;
  }

  const planWholePage = () => {
    const plan = planFromBrief(brief);
    setBatch(plan.map((p) => ({ ...p, state: 'pending' as const })));
  };

  const runBatch = async () => {
    setBatchRunning(true);
    for (let i = 0; i < batch.length; i++) {
      setBatch((b) => b.map((it, idx) => (idx === i ? { ...it, state: 'running' } : it)));
      try {
        await runOne({ prompt: batch[i].prompt, title: batch[i].title, section: batch[i].section, aspect: batch[i].aspect });
        setBatch((b) => b.map((it, idx) => (idx === i ? { ...it, state: 'done' } : it)));
      } catch (e) {
        setBatch((b) => b.map((it, idx) => (idx === i ? { ...it, state: 'error', error: e instanceof Error ? e.message : 'error' } : it)));
      }
    }
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
    const plan = planFromBrief(brief);
    if (plan.length) {
      setPrompt(plan[0].prompt);
      setTitle(plan[0].title);
      setSection(plan[0].section);
      setAspect(plan[0].aspect);
    } else {
      setPrompt(composePrompt({ brief, section }));
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
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, title, section, aspect }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.detail || 'Generation failed');
      setResult(data.entry);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  };

  const hasPrompt = prompt.trim().length > 0;

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="fixed right-4 top-4 z-50"><ThemeToggle /></div>

      {/* Animated aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
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

      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <motion.header {...fade} className="mb-10 text-center">
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

        {/* Step 1 — Brief */}
        <motion.section {...fade} transition={{ ...fade.transition, delay: 0.05 }} className="mb-6">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">1</span>
            Бриф или .md
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`group relative rounded-2xl border bg-card/60 backdrop-blur transition-all ${dragOver ? 'border-primary ring-4 ring-primary/20' : 'border-border'}`}
          >
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={5}
              placeholder="Напр.: Кофейный бренд. Пар над свежим эспрессо, тёплый утренний свет. Секции: пуровер, латте-арт, обжарка зёрен."
              className="w-full resize-none rounded-2xl bg-transparent p-4 text-sm outline-none placeholder:text-muted-foreground/70"
            />
            <div className="flex items-center justify-between gap-2 border-t border-border/60 p-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Upload className="h-3.5 w-3.5" /> Загрузить .md
              </button>
              <input ref={fileRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={planWholePage} disabled={!brief.trim()} className="gap-1.5">
                  <ListVideo className="h-4 w-4" /> Собрать всю страницу
                </Button>
                <Button size="sm" onClick={generatePrompt} disabled={!brief.trim()} className="gap-1.5">
                  <Wand2 className="h-4 w-4" /> Один промпт
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Batch plan — whole page */}
        <AnimatePresence>
          {batch.length > 0 && (
            <motion.section {...fade} className="mb-6">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary">★</span>
                План страницы — {batch.length} секц.
              </label>
              <div className="space-y-2 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur">
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
                  <a href="/" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">После готовности — открыть главную →</a>
                </div>
              </div>
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
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-1 backdrop-blur">
                {/* animated gradient sheen */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{ background: 'linear-gradient(110deg, transparent 30%, var(--primary), transparent 70%)' }}
                  animate={{ x: ['-120%', '120%'] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                />
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl bg-transparent p-4 text-sm outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2 p-3 pt-0">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Заголовок"
                      className="h-9 flex-1 min-w-[8rem] rounded-lg border border-border bg-background/50 px-3 text-sm outline-none focus:border-primary"
                    />
                    <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="h-9 rounded-lg border border-border bg-background/50 px-2 text-sm outline-none">
                      <option value="hero">hero</option>
                      <option value="background">background</option>
                      <option value="card">card</option>
                    </select>
                    <select value={aspect} onChange={(e) => setAspect(e.target.value)} className="h-9 rounded-lg border border-border bg-background/50 px-2 text-sm outline-none">
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                      <option value="1:1">1:1</option>
                    </select>
                    <Button size="sm" variant="outline" onClick={copyPrompt} className="gap-1.5">
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />} Копировать
                    </Button>
                  </div>
                </div>
              </div>
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
            </motion.div>
          )}

          {status === 'done' && result && (
            <motion.div {...fade} className="mt-8 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-500"><Check className="h-4 w-4" /> Готово — клип добавлен на сайт</div>
              <LazyVideo src={result.src} poster={result.poster} ratio={result.aspectRatio} className="w-full rounded-xl" />
              <div className="mt-4 flex items-center justify-between">
                <p className="truncate text-sm font-medium">{result.title}</p>
                <a href="/"><Button size="sm" variant="outline" className="gap-1.5">На главную <ArrowRight className="h-4 w-4" /></Button></a>
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
    </main>
  );
}
