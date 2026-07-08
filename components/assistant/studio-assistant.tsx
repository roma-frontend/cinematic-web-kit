'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wand2, X, Send, Mic, Eraser, ArrowUpRight, Loader2, Maximize2, Minimize2,
  Plus, Pencil, Trash2, Check, Copy, MessageSquare, PanelLeft, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import { assistantDict } from '@/lib/assistant-dict';
import { useStudioAssistant, type AssistantMessage } from './use-studio-assistant';
import { AssistantMarkdown } from './assistant-markdown';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const starters = t.starters[role] ?? t.starters.customer;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [a.messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); setOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Delete countdown (4s) with an undo window.
  useEffect(() => {
    if (!pendingDelete) return;
    if (pendingDelete.secs <= 0) { a.remove(pendingDelete.id); setPendingDelete(null); return; }
    const id = setTimeout(() => setPendingDelete((p) => (p ? { ...p, secs: p.secs - 1 } : p)), 1000);
    return () => clearTimeout(id);
  }, [pendingDelete, a]);

  const submit = () => { if (a.input.trim()) a.send(a.input); };
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

  const renderBubble = (m: AssistantMessage) => {
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
          {m.content ? (isUser ? <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p> : <AssistantMarkdown content={m.content} onNavigate={handleNavigate} />) : <TypingDots />}
        </div>
        {/* Row actions: edit (user) · copy (both) */}
        {m.content && (
          <div className={cn('mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100', isUser ? 'flex-row-reverse' : '')}>
            {isUser && (
              <button type="button" onClick={() => editUserMsg(m.id, m.content)} title={t.edit} aria-label={t.edit} className={iconBtn}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={() => copy(m.id, m.content)} title={t.copy} aria-label={t.copy} className={iconBtn}>
              {copiedId === m.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSidebar = () => (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/60 bg-muted/20">
      <div className="p-3">
        <button type="button" onClick={() => { a.newChat(); setSidebarOpen(false); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <Plus className="h-4 w-4" /> {t.newChat}
        </button>
      </div>
      <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.history}</p>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
        {a.conversations.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.emptyHistory}</p>}
        {a.conversations.map((c) => {
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
        })}
      </div>
    </div>
  );

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
        {!open && <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-primary/30" style={{ animationDuration: '2.4s' }} />}
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
                <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? t.collapse : t.expand} title={expanded ? t.collapse : t.expand} className={cn(iconBtn, 'hidden sm:block')}>
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className={iconBtn}><X className="h-4 w-4" /></button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
                <div className={cn(expanded && 'mx-auto w-full max-w-3xl space-y-3')}>
                  {a.messages.length === 0 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl rounded-bl-md border border-border/60 bg-card/80 px-3.5 py-2.5 text-sm backdrop-blur">
                        {a.unavailable ? t.unavailable : t.greeting}
                      </div>
                      {!a.unavailable && (
                        <div className="flex flex-wrap gap-2">
                          {starters.map((s) => (
                            <button key={s} type="button" onClick={() => a.send(s)}
                              className="rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10">{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {a.messages.map((m) => (
                    <div key={m.id} className="space-y-2">
                      {renderBubble(m)}
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
                    </div>
                  ))}
                  {a.error && <p className="text-center text-xs text-red-500">{t.error}</p>}
                </div>
              </div>

              {/* Composer */}
              {!a.unavailable && (
                <div className="border-t border-border/60 bg-background/60 p-3">
                  <div className={cn('mx-auto flex items-end gap-2 rounded-2xl border border-border/70 bg-card/60 px-2.5 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20', expanded && 'w-full max-w-3xl')}>
                    <textarea ref={a.inputRef} value={a.input} onChange={(e) => a.setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                      rows={1} placeholder={a.isListening ? t.listening : t.placeholder}
                      className="max-h-28 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground" />
                    {a.voiceSupported && (
                      <button type="button" onClick={a.startVoice} aria-label={t.voice} title={t.voice}
                        className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors', a.isListening ? 'bg-red-500/15 text-red-500' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                        <Mic className={cn('h-4 w-4', a.isListening && 'animate-pulse')} />
                      </button>
                    )}
                    <button type="button" onClick={submit} disabled={!a.input.trim() || a.isLoading} aria-label={t.send}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
                      {a.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">{t.poweredBy} · ⌘/Ctrl+J</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
