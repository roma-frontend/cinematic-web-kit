'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wand2, X, Send, Mic, Eraser, ArrowUpRight, Maximize2, Minimize2,
  Plus, Pencil, Trash2, Check, Copy, MessageSquare, PanelLeft, RotateCcw,
  Square, RefreshCw, Search, ArrowDown, CornerDownLeft, Sparkles, Database, Compass, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import { assistantDict } from '@/lib/assistant-dict';
import {
  buildSlashCommands, filterCommands, parseSlashQuery, quickActionPrompt,
  pushInputHistory, QUICK_ACTIONS, type SlashCommand,
} from '@/lib/assistant-commands';
import { useStudioAssistant, type AssistantMessage } from './use-studio-assistant';
import { AssistantMarkdown } from './assistant-markdown';

const DRAFT_KEY = 'cwk:assistant:draft';
const HISTORY_KEY = 'cwk:assistant:input-history';

type Role = 'customer' | 'admin' | 'superadmin';

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}

export function StudioAssistant({ role = 'customer' }: { role?: Role }) {
  const { locale } = useLocale();
  const t = assistantDict(locale);
  const a = useStudioAssistant();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; secs: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [memoryOpen, setMemoryOpen] = useState(false);
  // Smart autoscroll: only glue to the bottom when the user is already there.
  const [atBottom, setAtBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  // The FAB "ping" halo should invite the first open, then stop nagging.
  const [hasOpened, setHasOpened] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const starters = t.starters[role] ?? t.starters.customer;

  // ── Slash-command palette ────────────────────────────────────────────────
  const commands = buildSlashCommands(role, {
    routes: t.cmdRoutes, data: t.cmdData, newChat: t.newChat, clearChat: t.clear,
    openVerb: t.cmdOpen, showVerb: t.cmdShow,
  });
  const slash = parseSlashQuery(a.input);
  const slashMatches = slash.active ? filterCommands(commands, slash.query).slice(0, 8) : [];
  const showSlash = slash.active && slashMatches.length > 0;
  const [slashIdx, setSlashIdx] = useState(0);
  useEffect(() => { setSlashIdx(0); }, [a.input]);

  // ── Input history (↑/↓ recall of previously sent messages) ────────────────
  const inputHistory = useRef<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null); // null = live draft

  // Restore persisted draft + input history once on mount.
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft && !a.input) a.setInput(draft);
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(hist)) inputHistory.current = hist.filter((x) => typeof x === 'string');
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the composer draft as the user types (cleared on send).
  useEffect(() => {
    try {
      if (a.input) localStorage.setItem(DRAFT_KEY, a.input);
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, [a.input]);

  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setHasNew(false);
  };

  useEffect(() => {
    if (atBottom) scrollToBottom('smooth');
    else if (a.messages.length) setHasNew(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setOpen((v) => !v); }
      // Esc closes the panel — but let it first dismiss an in-progress inline
      // edit / rename / delete confirmation instead of nuking the whole panel.
      if (e.key === 'Escape' && open) {
        if (editing) { setEditing(null); return; }
        if (renaming) { setRenaming(null); return; }
        if (pendingDelete) { setPendingDelete(null); return; }
        if (memoryOpen) { setMemoryOpen(false); return; }
        if (sidebarOpen) { setSidebarOpen(false); return; }
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editing, renaming, pendingDelete, sidebarOpen, memoryOpen]);

  // Remember the first open so the FAB stops "pinging" once discovered, and
  // land the caret in the composer whenever the panel opens.
  useEffect(() => {
    if (!open) return;
    setHasOpened(true);
    setAtBottom(true);
    const id = setTimeout(() => { a.inputRef.current?.focus(); scrollToBottom('auto'); }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Delete countdown (4s) with an undo window.
  useEffect(() => {
    if (!pendingDelete) return;
    if (pendingDelete.secs <= 0) { a.remove(pendingDelete.id); setPendingDelete(null); return; }
    const id = setTimeout(() => setPendingDelete((p) => (p ? { ...p, secs: p.secs - 1 } : p)), 1000);
    return () => clearTimeout(id);
  }, [pendingDelete, a]);

  const persistHistory = () => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(inputHistory.current)); } catch { /* ignore */ }
  };
  const submit = () => {
    const text = a.input.trim();
    if (!text) return;
    inputHistory.current = pushInputHistory(inputHistory.current, text);
    persistHistory();
    setHistIdx(null);
    a.send(text);
  };
  const runCommand = (cmd: SlashCommand) => {
    a.setInput('');
    if (cmd.kind === 'navigate' && cmd.value) handleNavigate(cmd.value);
    else if (cmd.kind === 'new' || cmd.kind === 'clear') a.newChat();
    else if (cmd.kind === 'data' && cmd.value) a.send(`${t.cmdShow}: ${t.cmdData[cmd.value] ?? cmd.value}`);
    setTimeout(() => a.inputRef.current?.focus(), 40);
  };
  const runQuick = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (!a.isLoading) a.send(quickActionPrompt(action, locale));
  };
  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx((i) => (i + 1) % slashMatches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx((i) => (i - 1 + slashMatches.length) % slashMatches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); runCommand(slashMatches[slashIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); a.setInput(''); return; }
    }
    // Recall previously sent messages with ↑/↓ (single-line composer only).
    if (!showSlash && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const hist = inputHistory.current;
      const singleLine = !a.input.includes('\n');
      if (hist.length && (a.input === '' || histIdx !== null || singleLine)) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const next = histIdx === null ? hist.length - 1 : Math.max(0, histIdx - 1);
          setHistIdx(next); a.setInput(hist[next]); return;
        }
        if (e.key === 'ArrowDown' && histIdx !== null) {
          e.preventDefault();
          if (histIdx >= hist.length - 1) { setHistIdx(null); a.setInput(''); }
          else { const next = histIdx + 1; setHistIdx(next); a.setInput(hist[next]); }
          return;
        }
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const fmtTime = (ts?: number) => {
    if (!ts) return '';
    try { return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(ts); } catch { return ''; }
  };
  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600); } catch { /* ignore */ }
  };
  // Navigate, but first gracefully dismiss the panel so it doesn't linger on
  // top of the destination page — the AnimatePresence exit animation plays,
  // then we push the route.
  const handleNavigate = (route: string) => {
    setSidebarOpen(false);
    setExpanded(false);
    setOpen(false);
    setTimeout(() => a.navigate(route), 300);
  };

  const editUserMsg = (id: string, content: string) => setEditing({ id, value: content });
  const saveEdit = () => {
    if (editing && editing.value.trim()) a.editMessage(editing.id, editing.value);
    setEditing(null);
  };

  const iconBtn = 'rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  const renderBubble = (m: AssistantMessage, isStreaming: boolean) => {
    const isUser = m.role === 'user';
    // Inline edit of a sent user message — a nice textarea right in the bubble.
    if (isUser && editing?.id === m.id) {
      return (
        <div className="flex flex-col items-end">
          <div className="w-full max-w-[85%] rounded-2xl rounded-br-md border border-primary/50 bg-primary/5 p-2 shadow-sm">
            <textarea
              autoFocus
              value={editing.value}
              onChange={(e) => setEditing({ id: m.id, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                if (e.key === 'Escape') setEditing(null);
              }}
              rows={Math.min(6, Math.max(2, editing.value.split('\n').length))}
              className="w-full resize-none rounded-lg bg-transparent p-2 text-sm outline-none"
            />
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)}
                className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">{t.cancel}</button>
              <button type="button" onClick={saveEdit} disabled={!editing.value.trim()}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40">{t.save}</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={cn('group flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
          isUser ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border/60 bg-card/80 text-foreground backdrop-blur')}>
          {m.content
            ? (isUser
                ? <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                : <div className="relative">
                    <AssistantMarkdown content={m.content} onNavigate={handleNavigate} />
                    {isStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-primary align-middle motion-safe:animate-pulse" aria-hidden />}
                  </div>)
            : <div className="flex items-center gap-2"><TypingDots /><span className="text-[11px] text-muted-foreground">{t.statusThinking}</span></div>}
        </div>
        {/* Row actions: edit (user) · copy (both) · regenerate (assistant) · time */}
        {m.content && (
          <div className={cn('mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100', isUser ? 'flex-row-reverse' : '')}>
            {isUser && (
              <button type="button" onClick={() => editUserMsg(m.id, m.content)} title={t.edit} aria-label={t.edit} className={iconBtn}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={() => copy(m.id, m.content)} title={t.copy} aria-label={t.copy} className={iconBtn}>
              {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {!isUser && !a.isLoading && (
              <button type="button" onClick={() => a.regenerate(m.id)} title={t.regenerate} aria-label={t.regenerate} className={iconBtn}>
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {m.createdAt && <span className="px-1 text-[10px] tabular-nums text-muted-foreground/60">{fmtTime(m.createdAt)}</span>}
          </div>
        )}
      </div>
    );
  };

  const renderConvRow = (c: typeof a.conversations[number]) => {
    if (pendingDelete?.id === c.id) {
      return (
        <div key={c.id} className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
          <span className="flex-1 truncate">{t.deletingIn.replace('{n}', String(pendingDelete.secs))}</span>
          <button type="button" onClick={() => setPendingDelete(null)} className="inline-flex items-center gap-1 font-semibold hover:underline">
            <RotateCcw className="h-3 w-3" /> {t.undo}
          </button>
        </div>
      );
    }
    if (renaming?.id === c.id) {
      return (
        <form key={c.id} onSubmit={(e) => { e.preventDefault(); a.rename(c.id, renaming.value); setRenaming(null); }}
          className="flex items-center gap-1 px-1 py-1">
          <input autoFocus value={renaming.value} onChange={(e) => setRenaming({ id: c.id, value: e.target.value })}
            onBlur={() => { a.rename(c.id, renaming.value); setRenaming(null); }}
            className="min-w-0 flex-1 rounded-md border border-primary/50 bg-background px-2 py-1 text-sm outline-none" />
          <button type="submit" className={iconBtn} aria-label={t.save}><Check className="h-3.5 w-3.5" /></button>
        </form>
      );
    }
    const active = a.currentId === c.id;
    return (
      <div key={c.id} className={cn('group/item flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
        <button type="button" onClick={() => { a.selectConversation(c.id); setSidebarOpen(false); }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">{c.title}</span>
        </button>
        <button type="button" onClick={() => setRenaming({ id: c.id, value: c.title })} title={t.renameAction} aria-label={t.renameAction}
          className="rounded p-1 opacity-0 transition-opacity hover:bg-background group-hover/item:opacity-100"><Pencil className="h-3 w-3" /></button>
        <button type="button" onClick={() => setPendingDelete({ id: c.id, secs: 4 })} title={t.deleteAction} aria-label={t.deleteAction}
          className="rounded p-1 text-red-500/80 opacity-0 transition-opacity hover:bg-red-500/10 group-hover/item:opacity-100"><Trash2 className="h-3 w-3" /></button>
      </div>
    );
  };

  const renderSidebar = () => {
    const q = historyQuery.trim().toLowerCase();
    const filtered = q ? a.conversations.filter((c) => c.title.toLowerCase().includes(q)) : a.conversations;
    // Bucket by recency (based on updatedAt) for a tidy, scannable history.
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 864e5;
    const groups: { label: string; items: typeof filtered }[] = [
      { label: t.groupToday, items: filtered.filter((c) => c.updatedAt >= startOfToday) },
      { label: t.groupWeek, items: filtered.filter((c) => c.updatedAt < startOfToday && c.updatedAt >= weekAgo) },
      { label: t.groupOlder, items: filtered.filter((c) => c.updatedAt < weekAgo) },
    ].filter((g) => g.items.length > 0);
    return (
      <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/60 bg-muted/20">
        <div className="space-y-2 p-3">
          <button type="button" onClick={() => { a.newChat(); setSidebarOpen(false); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" /> {t.newChat}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-2.5 py-1.5 focus-within:border-primary/50">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder={t.searchHistory}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
            {historyQuery && (
              <button type="button" onClick={() => setHistoryQuery('')} className="text-muted-foreground hover:text-foreground" aria-label={t.cancel}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
          {a.conversations.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.emptyHistory}</p>}
          {a.conversations.length > 0 && filtered.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.noMatches}</p>}
          {groups.map((g) => (
            <div key={g.label} className="mb-1">
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
              <div className="space-y-0.5">{g.items.map(renderConvRow)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? t.close : t.open}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-xl shadow-primary/30 ring-1 ring-white/10"
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="h-6 w-6" /></motion.span>
          ) : (
            <motion.span key="w" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Wand2 className="h-6 w-6" /></motion.span>
          )}
        </AnimatePresence>
        {!open && !hasOpened && <span className="absolute inset-0 -z-10 rounded-2xl bg-primary/30 motion-safe:animate-ping" style={{ animationDuration: '2.4s' }} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={cn('fixed z-[60] flex overflow-hidden border border-border/70 bg-background/90 shadow-2xl backdrop-blur-xl',
              expanded ? 'inset-2 rounded-2xl sm:inset-6' : 'bottom-24 right-5 h-[min(70vh,560px)] w-[min(92vw,400px)] rounded-3xl')}>

            {/* Sidebar (fullscreen only) */}
            {expanded && <div className="hidden md:flex">{renderSidebar()}</div>}
            {expanded && sidebarOpen && (
              <div className="absolute inset-0 z-10 flex md:hidden">
                {renderSidebar()}
                <button className="flex-1 bg-black/40" aria-label={t.close} onClick={() => setSidebarOpen(false)} />
              </div>
            )}

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Header */}
              <div className="relative flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent px-3 py-3 sm:px-4">
                {expanded && (
                  <button type="button" onClick={() => setSidebarOpen((v) => !v)} className={cn(iconBtn, 'md:hidden')} aria-label={t.history}>
                    <PanelLeft className="h-4 w-4" />
                  </button>
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-md shadow-primary/30">
                  <Wand2 className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold tracking-tight">{t.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.subtitle}</p>
                </div>
                {a.messages.length > 0 && !expanded && (
                  <button type="button" onClick={a.newChat} aria-label={t.newChat} title={t.newChat} className={iconBtn}><Eraser className="h-4 w-4" /></button>
                )}
                <button type="button" onClick={() => { const next = !memoryOpen; setMemoryOpen(next); if (next) void a.loadMemories(); }}
                  aria-label={t.memory} title={t.memory}
                  className={cn(iconBtn, 'relative', memoryOpen && 'bg-muted text-foreground')}>
                  <Brain className="h-4 w-4" />
                  {a.memories.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{a.memories.length}</span>
                  )}
                </button>
                <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? t.collapse : t.expand} title={expanded ? t.collapse : t.expand} className={cn(iconBtn, 'hidden sm:block')}>
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className={iconBtn}><X className="h-4 w-4" /></button>
              </div>

              {/* Memory manager — durable facts the assistant recorded */}
              <AnimatePresence>
                {memoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-b border-border/60 bg-muted/20">
                    <div className={cn('mx-auto p-3', expanded && 'w-full max-w-3xl')}>
                      <div className="mb-2 flex items-center gap-2">
                        <Brain className="h-3.5 w-3.5 text-primary" />
                        <p className="flex-1 text-xs font-semibold">{t.memoryTitle}</p>
                        {a.memories.length > 0 && (
                          <button type="button" onClick={a.clearMemory}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-500/10">
                            <Trash2 className="h-3 w-3" /> {t.memoryClear}
                          </button>
                        )}
                      </div>
                      {a.memories.length === 0 ? (
                        <p className="py-2 text-[11px] leading-relaxed text-muted-foreground">{t.memoryEmpty}</p>
                      ) : (
                        <>
                          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                            {a.memories.map((mem) => (
                              <li key={mem.id} className="group/mem flex items-start gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5 text-xs">
                                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
                                <span className="min-w-0 flex-1 break-words leading-relaxed">{mem.content}</span>
                                <button type="button" onClick={() => a.forgetMemory(mem.id)} title={t.forget} aria-label={t.forget}
                                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover/mem:opacity-100">
                                  <X className="h-3 w-3" />
                                </button>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[10px] text-muted-foreground/70">{t.memoryHint}</p>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="relative min-h-0 flex-1">
              <div ref={scrollRef} onScroll={() => setAtBottom(isNearBottom())} role="log" aria-live="polite" aria-relevant="additions text" className="h-full space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
                <div className={cn(expanded && 'mx-auto w-full max-w-3xl space-y-3')}>
                  {a.loadingConversation && (
                    <div className="space-y-3" aria-label={t.loadingChat}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className={cn('flex', i % 2 ? 'justify-end' : 'justify-start')}>
                          <div className={cn('h-14 animate-pulse rounded-2xl bg-muted/60', i % 2 ? 'w-1/2' : 'w-2/3')} />
                        </div>
                      ))}
                    </div>
                  )}
                  {!a.loadingConversation && a.messages.length === 0 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl rounded-bl-md border border-border/60 bg-card/80 px-3.5 py-2.5 text-sm backdrop-blur">
                        {a.unavailable ? t.unavailable : t.greeting}
                      </div>
                      {!a.unavailable && (expanded ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t.examplesTitle}</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {starters.map((s) => (
                              <button key={s} type="button" onClick={() => a.send(s)}
                                className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3.5 py-3 text-left text-sm font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10">
                                <Sparkles className="h-4 w-4 shrink-0 text-primary" /> {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {starters.map((s) => (
                            <button key={s} type="button" onClick={() => a.send(s)}
                              className="rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10">{s}</button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {a.messages.map((m, i) => (
                    <div key={m.id} className="space-y-2">
                      {renderBubble(m, a.isLoading && i === a.messages.length - 1 && m.role === 'assistant')}
                      {m.role === 'assistant' && m.remembered && m.remembered.length > 0 && (
                        <div className="flex flex-col gap-1 pl-1">
                          {m.remembered.map((fact, fi) => (
                            <button key={`${m.id}-mem-${fi}`} type="button" onClick={() => { setMemoryOpen(true); void a.loadMemories(); }}
                              className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary/90 transition-colors hover:bg-primary/10">
                              <Brain className="h-3 w-3 shrink-0" />
                              <span className="truncate">{t.remembered}: {fact}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {m.role === 'assistant' && m.route && !a.isLoading && (
                        <div className="pl-1">
                          <button type="button" onClick={() => handleNavigate(m.route!)}
                            className="group inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                            {t.goTo} <code className="font-mono text-[11px]">{m.route}</code>
                            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </button>
                        </div>
                      )}
                      {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && !a.isLoading && (
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          {m.suggestions.map((s) => (
                            <button key={s} type="button" onClick={() => a.send(s)}
                              className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                              {s}<ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      )}
                      {m.role === 'assistant' && m.content && !a.isLoading && i === a.messages.length - 1 && (
                        <div className="flex flex-wrap gap-1.5 pl-1 pt-0.5">
                          {QUICK_ACTIONS.map((qa) => (
                            <button key={qa} type="button" onClick={() => runQuick(qa)}
                              className="rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                              {t.quick[qa]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {a.error && <p className="text-center text-xs text-red-500">{t.error}</p>}
                </div>
              </div>
              {/* Jump to latest — appears when new content arrives while scrolled up */}
              <AnimatePresence>
                {hasNew && (
                  <motion.button type="button" onClick={() => scrollToBottom('smooth')}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur hover:bg-muted">
                    <ArrowDown className="h-3.5 w-3.5" /> {t.newMessages}
                  </motion.button>
                )}
              </AnimatePresence>
              </div>

              {/* Composer */}
              {!a.unavailable && (
                <div className="border-t border-border/60 bg-background/60 p-3">
                  <div className={cn('relative mx-auto', expanded && 'w-full max-w-3xl')}>
                    <AnimatePresence>
                      {showSlash && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-border/70 bg-popover/95 shadow-2xl backdrop-blur-xl">
                          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t.commandsTitle}</p>
                          <div className="max-h-64 overflow-y-auto p-1 [scrollbar-width:thin]">
                            {slashMatches.map((cmd, i) => {
                              const Icon = cmd.kind === 'navigate' ? Compass : cmd.kind === 'data' ? Database : Plus;
                              return (
                                <button key={cmd.id} type="button"
                                  onMouseEnter={() => setSlashIdx(i)}
                                  onClick={() => runCommand(cmd)}
                                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                                    i === slashIdx ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-3.5 w-3.5" /></span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-foreground">{cmd.label}</span>
                                    {cmd.hint && <span className="block truncate text-[11px] text-muted-foreground/70">{cmd.hint}</span>}
                                  </span>
                                  {i === slashIdx && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card/60 px-2.5 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                    <textarea ref={a.inputRef} value={a.input} onChange={(e) => a.setInput(e.target.value)}
                      onKeyDown={onComposerKey}
                      rows={1} placeholder={a.isListening ? t.listening : t.placeholder}
                      className="max-h-28 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground" />
                    {a.voiceSupported && (
                      <button type="button" onClick={a.startVoice} aria-label={t.voice} title={t.voice}
                        className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors', a.isListening ? 'bg-red-500/15 text-red-500' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                        <Mic className={cn('h-4 w-4', a.isListening && 'animate-pulse')} />
                      </button>
                    )}
                    {a.isLoading ? (
                      <button type="button" onClick={a.stop} aria-label={t.stop} title={t.stop}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Square className="h-3.5 w-3.5 fill-current" />
                      </button>
                    ) : (
                      <button type="button" onClick={submit} disabled={!a.input.trim()} aria-label={t.send}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                    <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">{t.shiftEnterHint}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
