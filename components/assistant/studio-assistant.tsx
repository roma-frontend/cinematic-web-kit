'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wand2, X, Send, Mic, Eraser, ArrowUpRight, Maximize2, Minimize2,
  Plus, Pencil, Trash2, Check, Copy, MessageSquare, PanelLeft, RotateCcw,
  Square, RefreshCw, Search, ArrowDown, CornerDownLeft, Sparkles, Database, Compass, Brain, FileText,
  ThumbsUp, ThumbsDown, Loader2, PenLine, Globe, User, Inbox, ShieldCheck, AlertTriangle, CheckCircle2, ImagePlus,
  Bold, Italic, Code, List, ListOrdered, Quote, Download, Pin, Keyboard, Volume2, VolumeX, Share2, Settings, GitBranch,
  ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import { assistantDict } from '@/lib/assistant-dict';
import {
  buildSlashCommands, filterCommands, parseSlashQuery, quickActionPrompt,
  pushInputHistory, QUICK_ACTIONS, type SlashCommand,
  parseMentionQuery, filterMentions, insertMention, type MentionEntity,
} from '@/lib/assistant-commands';
import { parseMarkdownTable, sitePreviewUrl } from '@/lib/assistant-canvas';
import { taskProgress } from '@/lib/assistant-task-core';
import { exportConversation, type ExportFormat } from '@/lib/assistant-export';
import { useStudioAssistant, type AssistantMessage } from './use-studio-assistant';
import { copyToClipboard } from '@/lib/clipboard';
import { AssistantMarkdown } from './assistant-markdown';
import { ArtifactsCanvas, type Artifact } from './artifacts-canvas';
import Image from 'next/image';

const DRAFT_KEY = 'cwk:assistant:draft';
const HISTORY_KEY = 'cwk:assistant:input-history';

function playAssistantSound(type: 'open' | 'click' | 'success' | 'send') {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  try {
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    if (type === 'open') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.setValueAtTime(0.1, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    /* ignore context failures */
  }
}

function PipelineTicker() {
  const [logs, setLogs] = useState<string[]>([]);
  const steps = useMemo(() => [
    '⚡ Initializing Cinematic Pipeline...',
    '🎨 Fetching Visual Mood presets...',
    '📝 Generating responsive block templates...',
    '⚙️ Optimizing layout CSS & layout hierarchy...',
    '✨ Rerouting and applying assets...',
  ], []);

  useEffect(() => {
    setLogs([steps[0]]);
    const interval = setInterval(() => {
      setLogs((prev) => {
        if (prev.length < steps.length) {
          return [...prev, steps[prev.length]];
        }
        return prev;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [ steps ]);

  return (
    <div className="mt-2 rounded-xl border border-primary/20 bg-black/80 p-3 font-mono text-[10px] leading-relaxed text-green-300 shadow-inner">
      {logs.map((log, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-primary/70">&gt;</span>
          <span>{log}</span>
          {i === logs.length - 1 && i < steps.length - 1 && (
            <span className="h-2 w-1.5 animate-pulse bg-green-300" />
          )}
        </div>
      ))}
    </div>
  );
}

type Role = 'customer' | 'admin' | 'superadmin';
type StreamStatusValue = 'idle' | 'thinking' | 'writing' | 'fetching';

function StreamStatus({
  status,
  inline = false,
  thinkingLabel,
  writingLabel,
  fetchingLabel,
}: {
  status: StreamStatusValue;
  inline?: boolean;
  thinkingLabel: string;
  writingLabel: string;
  fetchingLabel: string;
}) {
  const map = {
    idle: { icon: null, label: '' },
    thinking: { icon: Sparkles, label: thinkingLabel },
    writing: { icon: PenLine, label: writingLabel },
    fetching: { icon: Database, label: fetchingLabel },
  } satisfies Record<StreamStatusValue, { icon: typeof Sparkles | typeof PenLine | typeof Database | null; label: string }>;

  const { icon: Icon, label } = map[status];
  if (!Icon || !label) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium text-primary/80', inline ? '' : 'rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1')}>
      <Icon className={cn('h-3 w-3', status !== 'thinking' && 'motion-safe:animate-pulse')} />
      {status === 'thinking' && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary/80" />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}

export function StudioAssistant({ role = 'customer' }: { role?: Role }) {
  const { locale } = useLocale();
  const t = assistantDict(locale);
  const a = useStudioAssistant(role);
  const { input, inputRef, setInput, attachments, uploadAttachment } = a;
  const [open, setOpen] = useState(false);
  const [confirmingActionId, setConfirmingActionId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; secs: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [feedbackReasoning, setFeedbackReasoning] = useState<{ id: string; value: string } | null>(null);
  const [themeInstruction, setThemeInstruction] = useState('');
  // Smart autoscroll: only glue to the bottom when the user is already there.
  const [atBottom, setAtBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  // The FAB "ping" halo should invite the first open, then stop nagging.
  const [hasOpened, setHasOpened] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const starters = t.starters[role] ?? t.starters.customer;
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [variantIdx, setVariantIdx] = useState<Record<string, number>>({});
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const lastMsg = a.messages[a.messages.length - 1];
    if (lastMsg?.actionResult?.ok) {
      playAssistantSound('success');
    }
  }, [a.messages]);
  const composerRef = useRef<HTMLDivElement>(null);
  const [searchResults, setSearchResults] = useState<Array<{ conversationId: string; messageId: string; role: string; content: string; conversationTitle: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!a.currentId) return;
    setIsSharing(true);
    try {
      const res = await fetch('/api/assistant/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: a.currentId }),
      });
      if (res.ok) {
        const { shareToken } = await res.json();
        const link = `${window.location.origin}/shared/${shareToken}`;
        setShareLink(link);
        setLinkCopied(false);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsSharing(false);
    }
  }, [a.currentId]);

  const copyShareLink = useCallback(async () => {
    if (!shareLink) return;
    const success = await copyToClipboard(shareLink);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => {
        setLinkCopied(false);
        setShareLink(null);
      }, 1500);
    }
  }, [shareLink]);

  const handleSearch = useCallback(async (query: string) => {
    setHistoryQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/assistant/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

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

  // ── @-mention entity picker ────────────────────────────────────────────────
  const mention = parseMentionQuery(a.input);
  const mentionEntities = a.entities;
  const mentionMatches = mention.active ? filterMentions(mentionEntities, mention.query).slice(0, 6) : [];
  const showMention = mention.active && mentionMatches.length > 0;
  const [mentionIdx, setMentionIdx] = useState(0);
  useEffect(() => { setMentionIdx(0); }, [a.input, mentionEntities.length]);
  const mentionTypeLabels: Record<MentionEntity['type'], string> = {
    site: t.cmdData['my-sites'] ?? 'site',
    user: t.cmdData.users ?? 'user',
    submission: t.cmdRoutes['/dashboard/submissions'] ?? 'submission',
  };
  const entityIcon = (type: MentionEntity['type']) => {
    switch (type) {
      case 'site': return Globe;
      case 'user': return User;
      case 'submission': return Inbox;
      default: return Database;
    }
  };

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
      if (e.key === '?' && !open && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if (e.key === 'Escape' && showShortcuts) { setShowShortcuts(false); return; }
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
  }, [open, editing, renaming, pendingDelete, sidebarOpen, memoryOpen, showShortcuts]);

  // On the first open, reveal the history sidebar smoothly so the conversation
  // list is visible immediately instead of staying hidden in the compact mode.
useEffect(() => {
  if (!open) return;
  if (!hasOpened) {        // только первый раз
    setHasOpened(true);
    setExpanded(true);
    setSidebarOpen(true);
  }
  setAtBottom(true);
  const id = setTimeout(() => { a.inputRef.current?.focus(); scrollToBottom('auto'); }, 60);
  return () => clearTimeout(id);
}, [open, hasOpened, a.inputRef ]);

  // Delete countdown (4s) with an undo window.
  useEffect(() => {
    if (!pendingDelete) return;
    if (pendingDelete.secs <= 0) { a.remove(pendingDelete.id); setPendingDelete(null); return; }
    const id = setTimeout(() => setPendingDelete((p) => (p ? { ...p, secs: p.secs - 1 } : p)), 1000);
    return () => clearTimeout(id);
  }, [pendingDelete]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistHistory = () => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(inputHistory.current)); } catch { /* ignore */ }
  };
  const submit = () => {
    const text = a.input.trim();
    if (!text) return;
    playAssistantSound('send');
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
  const runMention = (e: MentionEntity) => {
    const next = insertMention(a.input, e, mentionTypeLabels);
    a.setInput(next);
    setTimeout(() => a.inputRef.current?.focus(), 40);
  };
  const runQuick = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (!a.isLoading) a.send(quickActionPrompt(action, locale));
  };
  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMention) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % mentionMatches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); runMention(mentionMatches[mentionIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); a.setInput(a.input.replace(/@\S*$/, '')); return; }
    }
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
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
    }
  };
  // Navigate, but first gracefully dismiss the panel so it doesn't linger on
  // top of the destination page — the AnimatePresence exit animation plays,
  // then we push the route.
  const handleNavigate = async (route: string) => {
    setSidebarOpen(false);
    setExpanded(false);
    setOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await a.navigate(route);
  };

  const editUserMsg = (id: string, content: string) => setEditing({ id, value: content });
  const saveEdit = () => {
    if (editing && editing.value.trim()) a.editMessage(editing.id, editing.value);
    setEditing(null);
  };

  const insertMarkdown = useCallback((prefix: string, suffix = '') => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = input.slice(start, end);
    const before = input.slice(0, start);
    const after = input.slice(end);
    setInput(`${before}${prefix}${selected}${suffix}${after}`);
    setTimeout(() => {
      el.focus();
      const pos = start + prefix.length + selected.length + suffix.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }, [input, inputRef, setInput]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    for (const file of files.slice(0, 3 - attachments.length)) {
      void uploadAttachment(file);
    }
  }, [attachments.length, uploadAttachment]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (imageItem && attachments.length < 3) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        void uploadAttachment(file);
      }
    }
  }, [attachments.length, uploadAttachment]);

  const iconBtn = 'rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

  const renderFeedback = (m: AssistantMessage) => {
    if (m.role !== 'assistant' || a.isLoading || !m.content) return null;
    const sent = m.feedback?.rating;
    if (sent) {
      return (
        <div className="flex items-center gap-1.5 pl-1 text-[11px] text-muted-foreground/70">
          {sent === 'up' ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
          <span>{t.feedbackSent}</span>
        </div>
      );
    }
    if (feedbackReasoning?.id === m.id) {
      return (
        <div className="flex flex-col gap-1.5 pl-1">
          <textarea
            autoFocus
            value={feedbackReasoning.value}
            onChange={(e) => setFeedbackReasoning({ id: m.id, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); a.sendFeedback(m.id, 'down', feedbackReasoning.value); setFeedbackReasoning(null); }
              if (e.key === 'Escape') setFeedbackReasoning(null);
            }}
            rows={2}
            placeholder={t.feedbackReason}
            className="max-w-md resize-none rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { a.sendFeedback(m.id, 'down', feedbackReasoning.value); setFeedbackReasoning(null); }}
              className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90">{t.send}</button>
            <button type="button" onClick={() => setFeedbackReasoning(null)}
              className="rounded-lg px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">{t.cancel}</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-0.5 pl-1">
        <button type="button" onClick={() => a.sendFeedback(m.id, 'up')} aria-label={t.feedbackGood} title={t.feedbackGood}
          className={iconBtn}><ThumbsUp className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => setFeedbackReasoning({ id: m.id, value: '' })} aria-label={t.feedbackBad} title={t.feedbackBad}
          className={iconBtn}><ThumbsDown className="h-3.5 w-3.5" /></button>
      </div>
    );
  };

  const renderAction = (m: AssistantMessage) => {
    if (m.role !== 'assistant' || !m.action) return null;
    const result = m.actionResult;
    if (result?.ok) {
      return (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-emerald-700">{t.actionSuccess}</p>
            <p className="text-emerald-700/80">{result.message}</p>
          </div>
          {result.redirect && (
            <button type="button" onClick={() => handleNavigate(result.redirect!)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
              {t.openResult} <ArrowUpRight className="h-3 w-3" />
            </button>
          )}
        </div>
      );
    }
    if (result) {
      const cancelled = result.message === 'cancelled';
      return (
        <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-xs',
          cancelled ? 'border-amber-500/30 bg-amber-500/10' : 'border-red-500/30 bg-red-500/10')}>
          <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', cancelled ? 'text-amber-600' : 'text-red-600')} />
          <div className="min-w-0 flex-1">
            <p className={cn('font-semibold', cancelled ? 'text-amber-700' : 'text-red-700')}>
              {cancelled ? t.actionCancelled : t.actionFailed}
            </p>
            {!cancelled && (
              <p className="text-red-700/80">{result.message === 'network_error' ? t.actionNetworkError : result.message}</p>
            )}
          </div>
        </div>
      );
    }
    const busy = confirmingActionId === m.id;
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-foreground">{t.proposedAction}</p>
            <p className="text-muted-foreground">{m.action.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy}
            onClick={async () => { setConfirmingActionId(m.id); await a.confirmAction(m.id); setConfirmingActionId((id) => id === m.id ? null : id); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-60">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {t.actionProceed}
          </button>
          <button type="button" disabled={busy} onClick={() => a.dismissAction(m.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60">
            {t.cancel}
          </button>
        </div>
      </div>
    );
  };

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
          {m.attachments && m.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {m.attachments.map((attachment) => (
                <Image key={attachment.url} src={attachment.url} alt={attachment.name} className="h-20 w-20 rounded-lg border border-white/20 object-cover" />
              ))}
            </div>
          )}
          {m.content
            ? (isUser
                ? <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                : <div className="relative">
                    <AssistantMarkdown content={m.content} onNavigate={handleNavigate} />
                    {isStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-primary align-middle motion-safe:animate-pulse" aria-hidden />}
                  </div>)
            : <div className="flex items-center gap-2"><StreamStatus status={a.streamStatus} inline thinkingLabel={t.statusThinking} writingLabel={t.statusWriting} fetchingLabel={t.statusFetching} /></div>}
        </div>
        {/* Row actions: edit (user) · copy (both) · regenerate (assistant) · tts · fork · time */}
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
            {!isUser && a.ttsSupported && (
              <button type="button" onClick={() => a.speak(m.content)} title={a.isSpeaking ? t.stopSpeaking : t.speak} aria-label={a.isSpeaking ? t.stopSpeaking : t.speak} className={cn(iconBtn, a.isSpeaking && 'text-primary')}>
                {a.isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            )}
            {!isUser && !a.isLoading && (
              <button type="button" onClick={() => a.regenerate(m.id)} title={t.regenerate} aria-label={t.regenerate} className={iconBtn}>
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {!isUser && !a.isLoading && (
              <button type="button" onClick={() => {
                const idx = a.messages.indexOf(m);
                if (idx > 0) {
                  const userMsg = a.messages.slice(0, idx).reverse().find((prev: AssistantMessage) => prev.role === 'user');
                  if (userMsg) a.send(userMsg.content);
                }
              }} title={t.fork} aria-label={t.fork} className={iconBtn}>
                <GitBranch className="h-3.5 w-3.5" />
              </button>
            )}
            {a.responseVariants[m.id] && a.responseVariants[m.id].length > 1 && (
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => setVariantIdx((prev) => ({ ...prev, [m.id]: Math.max(0, (prev[m.id] ?? 0) - 1) }))} className={iconBtn} disabled={(variantIdx[m.id] ?? 0) === 0}>
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] tabular-nums text-muted-foreground">{(variantIdx[m.id] ?? 0) + 1}/{a.responseVariants[m.id].length}</span>
                <button type="button" onClick={() => setVariantIdx((prev) => ({ ...prev, [m.id]: Math.min(a.responseVariants[m.id].length - 1, (prev[m.id] ?? 0) + 1) }))} className={iconBtn} disabled={(variantIdx[m.id] ?? 0) >= a.responseVariants[m.id].length - 1}>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
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
    const pinned = a.pinnedIds.has(c.id);
    return (
      <div key={c.id} className={cn('group/item flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
        <button type="button" onClick={() => { a.selectConversation(c.id); setSidebarOpen(false); }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">{c.title}</span>
        </button>
        <button type="button" onClick={() => a.togglePin(c.id)} title={t.pin} aria-label={t.pin}
          className={cn('rounded p-1 transition-opacity', pinned ? 'text-primary opacity-100' : 'opacity-0 group-hover/item:opacity-100 hover:bg-background')}>
          <Pin className="h-3 w-3" />
        </button>
        <button type="button" onClick={() => setRenaming({ id: c.id, value: c.title })} title={t.renameAction} aria-label={t.renameAction}
          className="rounded p-1 opacity-0 transition-opacity hover:bg-background group-hover/item:opacity-100"><Pencil className="h-3 w-3" /></button>
        <button type="button" onClick={() => setPendingDelete({ id: c.id, secs: 4 })} title={t.deleteAction} aria-label={t.deleteAction}
          className="rounded p-1 text-red-500/80 opacity-0 transition-opacity hover:bg-red-500/10 group-hover/item:opacity-100"><Trash2 className="h-3 w-3" /></button>
      </div>
    );
  };

  const renderCanvas = () => {
    const c = a.canvas;
    if (!expanded || c.type === 'none') return null;

    const header = (
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <PanelLeft className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">{t.canvasTitle}</span>
        </div>
        <button type="button" onClick={a.closeCanvas} aria-label={t.canvasClose} title={t.canvasClose}
          className={cn(iconBtn, 'h-7 w-7')}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );

    if (c.type === 'data' && c.dataMarkdown) {
      const parsed = parseMarkdownTable(c.dataMarkdown);
      return (
        <div className="flex h-full w-full flex-col md:w-80 lg:w-96 xl:w-[28rem]">
          {header}
          <div className="flex-1 overflow-auto p-3 [scrollbar-width:thin]">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <Database className="h-3 w-3" /> {t.canvasDataTable}
            </div>
            {parsed ? (
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>{parsed.headers.map((h, i) => <th key={i} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((row, ri) => (
                      <tr key={ri} className="border-t border-border/60">
                        {row.map((cell, ci) => <td key={ci} className="px-2 py-1.5">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="whitespace-pre-wrap rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                {c.dataMarkdown}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (c.type === 'preview' || c.type === 'diff-theme') {
      const diff = c.type === 'diff-theme' ? c.themeDiff : undefined;
      const previewThemeId = diff?.afterId;
      const previewUrl = c.siteSlug ? sitePreviewUrl(c.siteSlug, previewThemeId) : '';
      return (
        <div className="flex h-full w-full flex-col md:w-80 lg:w-96 xl:w-[28rem]">
          {header}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden bg-muted/10">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={t.canvasPreview}
                  className="h-full w-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                  <Globe className="h-6 w-6 opacity-40" />
                  <p>{t.canvasEmpty}</p>
                </div>
              )}
            </div>
            {c.type === 'diff-theme' && diff && (
              <div className="border-t border-border/60 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-semibold">{t.canvasThemeDiff}</p>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-card/60 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{t.canvasCurrentTheme}</p>
                    <p className="truncate text-xs font-semibold">{diff.beforeLabel ?? diff.beforeId}</p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-primary/80">{t.canvasProposedTheme}</p>
                    <p className="truncate text-xs font-semibold text-primary">{diff.afterLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={a.canvasBusy} onClick={async () => {
                    const res = await a.commitTheme(c.siteId!, diff.afterId);
                    if (res.ok) a.closeCanvas();
                  }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-60">
                    {a.canvasBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {t.canvasApply}
                  </button>
                  <button type="button" disabled={a.canvasBusy} onClick={a.closeCanvas}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60">
                    <RotateCcw className="h-3 w-3" /> {t.canvasRollback}
                  </button>
                </div>
              </div>
            )}
            {c.type === 'preview' && c.siteSlug && (
              <div className="border-t border-border/60 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold">{t.canvasLivePreview}</p>
                <p className="mb-2 truncate text-[11px] text-muted-foreground">{c.siteName ?? c.siteSlug}</p>
                <div className="flex items-center gap-2">
                  <input
                    value={themeInstruction}
                    onChange={(e) => setThemeInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && themeInstruction.trim() && c.siteId) { void a.previewTheme(c.siteId, themeInstruction); setThemeInstruction(''); } }}
                    placeholder={locale === 'ru' ? 'Опишите новую тему…' : locale === 'hy' ? 'Նկարագրեք նոր թեման…' : 'Describe a new theme…'}
                    className="min-w-0 flex-1 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  />
                  <button type="button" disabled={a.canvasBusy || !themeInstruction.trim() || !c.siteId}
                    onClick={() => { if (c.siteId) { void a.previewTheme(c.siteId, themeInstruction); setThemeInstruction(''); } }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-60">
                    {a.canvasBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    {t.canvasApply}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full w-full flex-col md:w-80 lg:w-96 xl:w-[28rem]">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
          <Globe className="h-6 w-6 opacity-40" />
          <p>{t.canvasHint}</p>
        </div>
      </div>
    );
  };

  const renderTasks = () => {
    if (a.tasks.length === 0) return null;
    return (
      <div className="border-b border-border/60 bg-muted/20 p-3">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          {a.tasks.slice(0, 3).map((task) => {
            const progress = taskProgress(task.steps);
            return (
              <div key={task.id} className="rounded-xl border border-border/60 bg-card/60 p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold">{task.title}</p>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{progress}%</span>
                  <button type="button" onClick={() => void a.cancelTask(task.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-red-500" title={t.cancel} aria-label={t.cancel}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="space-y-1">
                  {task.steps.map((step) => {
                    const complete = step.status === 'done' || step.status === 'skipped';
                    return (
                      <label key={step.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-muted/60">
                        <input type="checkbox" checked={complete} onChange={() => void a.updateTaskStep(task.id, step.id, complete ? 'pending' : 'done')} className="accent-primary" />
                        <span className={cn('min-w-0 flex-1 truncate', complete && 'text-muted-foreground line-through')}>{step.title}</span>
                        {!complete && (
                          <button type="button" onClick={(event) => { event.preventDefault(); void a.updateTaskStep(task.id, step.id, step.status === 'running' ? 'pending' : 'running'); }}
                            className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', step.status === 'running' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                            {step.status === 'running' ? (locale === 'ru' ? 'В работе' : locale === 'hy' ? 'Ընթացքում' : 'Working') : (locale === 'ru' ? 'Начать' : locale === 'hy' ? 'Սկսել' : 'Start')}
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSidebar = () => {
    const q = historyQuery.trim().toLowerCase();
    const filtered = q ? a.conversations.filter((c) => c.title.toLowerCase().includes(q)) : a.conversations;
    const pinned = filtered.filter((c) => a.pinnedIds.has(c.id));
    const unpinned = filtered.filter((c) => !a.pinnedIds.has(c.id));
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 864e5;
    const groups: { label: string; items: typeof filtered }[] = [
      { label: t.groupToday, items: unpinned.filter((c) => c.updatedAt >= startOfToday) },
      { label: t.groupWeek, items: unpinned.filter((c) => c.updatedAt < startOfToday && c.updatedAt >= weekAgo) },
      { label: t.groupOlder, items: unpinned.filter((c) => c.updatedAt < weekAgo) },
    ].filter((g) => g.items.length > 0);
    return (
      <div className="flex h-full w-[min(86vw,320px)] shrink-0 flex-col border-r border-border/60 bg-background shadow-2xl md:shadow-none sm:w-72">
        <div className="space-y-2 p-3">
          <button type="button" onClick={() => { a.newChat(); setSidebarOpen(false); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" /> {t.newChat}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 px-2.5 py-1.5 focus-within:border-primary/50">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input value={historyQuery} onChange={(e) => handleSearch(e.target.value)} placeholder={t.searchHistory}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
            {isSearching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {historyQuery && !isSearching && (
              <button type="button" onClick={() => { setHistoryQuery(''); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground" aria-label={t.cancel}><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:thin]">
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                {t.searchResults} ({searchResults.length})
              </p>
              {searchResults.map((result) => (
                <button
                  key={result.messageId}
                  type="button"
                  onClick={() => {
                    a.selectConversation(result.conversationId);
                    setSidebarOpen(false);
                    setSearchResults([]);
                    setHistoryQuery('');
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <p className="truncate font-medium text-foreground">{result.conversationTitle}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{result.content}</p>
                </button>
              ))}
            </div>
          ) : (
            <>
              {a.conversations.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.emptyHistory}</p>}
              {a.conversations.length > 0 && filtered.length === 0 && <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.noMatches}</p>}
              {pinned.length > 0 && (
                <div className="mb-1">
                  <p className="flex items-center gap-1 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                    <Pin className="h-2.5 w-2.5" /> {t.pinned}
                  </p>
                  <div className="space-y-0.5">{pinned.map(renderConvRow)}</div>
                </div>
              )}
              {groups.map((g) => (
                <div key={g.label} className="mb-1">
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.label}</p>
                  <div className="space-y-0.5">{g.items.map(renderConvRow)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.button type="button" onClick={() => setOpen((v) => { const next = !v; playAssistantSound(next ? 'open' : 'click'); return next; })} aria-label={open ? t.close : t.open}
        className="fixed z-[60] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-xl shadow-primary/30 ring-1 ring-white/10"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))', right: 'max(1.25rem, env(safe-area-inset-right))' }}
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
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{t.shortcuts}</p>
                </div>
                <button type="button" onClick={() => setShowShortcuts(false)} className={iconBtn}><X className="h-4 w-4" /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 [scrollbar-width:thin]">
                <div className="space-y-3">
                  {[
                    { keys: '⌘/Ctrl + J', desc: t.shortcutToggle },
                    { keys: 'Esc', desc: t.shortcutClose },
                    { keys: 'Enter', desc: t.shortcutSend },
                    { keys: 'Shift + Enter', desc: t.shortcutNewline },
                    { keys: '/', desc: t.shortcutCommands },
                    { keys: '@', desc: t.shortcutMentions },
                    { keys: '↑/↓', desc: t.shortcutHistory },
                    { keys: '?', desc: t.shortcutHelp },
                  ].map((s) => (
                    <div key={s.keys} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{s.desc}</span>
                      <kbd className="rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">{s.keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareLink && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShareLink(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{t.shareLink}</p>
                </div>
                <button type="button" onClick={() => setShareLink(null)} className={iconBtn}><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4">
                <p className="mb-3 text-xs text-muted-foreground">{t.shareLinkDescription}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {t.copied}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        {t.copy}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className={cn('fixed z-[60] flex overflow-hidden border border-border/70 bg-background/90 shadow-2xl backdrop-blur-xl',
              expanded ? 'inset-2 rounded-2xl sm:inset-6' : 'bottom-24 right-5 h-[min(70vh,560px)] w-[min(92vw,400px)] rounded-3xl')}>

            {/* Sidebar (desktop full size, mobile as fullscreen drawer only when expanded) */}
            {expanded && <div className="hidden md:flex">{renderSidebar()}</div>}
            {expanded && sidebarOpen && (
              <div className="absolute inset-0 z-20 flex md:hidden">
                {renderSidebar()}
                <button className="flex-1 bg-black/40" aria-label={t.close} onClick={() => setSidebarOpen(false)} />
              </div>
            )}

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Header */}
              <div className="relative flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent px-3 py-3 sm:px-4">
                <button type="button" onClick={() => {
                  setExpanded(true);
                  setSidebarOpen(true);
                }} className={cn(iconBtn, "block md:hidden")} aria-label={t.history} title={t.history}>
                  <PanelLeft className="h-4 w-4" />
                </button>
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
                {expanded && (
                  <button type="button" onClick={() => {
                    if (a.canvas.type !== 'none') a.closeCanvas();
                    else {
                      const site = a.entities.find((e) => e.type === 'site');
                      if (site) a.openCanvasSite(site.id, site.hint ?? '', site.label);
                    }
                  }} aria-label={t.canvasTitle} title={t.canvasTitle}
                    className={cn(iconBtn, a.canvas.type !== 'none' && 'bg-muted text-foreground')}>
                    <PanelLeft className="h-4 w-4" />
                  </button>
                )}
                {a.messages.length > 0 && (
                  <div className="relative hidden sm:block">
                    <button type="button" onClick={() => setShowExport((v) => !v)} aria-label={t.exportChat} title={t.exportChat} className={iconBtn}>
                      <Download className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {showExport && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-1 shadow-xl backdrop-blur-xl">
                          {(['markdown', 'json', 'text'] as ExportFormat[]).map((fmt) => (
                            <button key={fmt} type="button" onClick={() => { exportConversation(a.messages, a.conversations.find((c) => c.id === a.currentId)?.title ?? 'Chat', fmt); setShowExport(false); }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted">
                              <FileText className="h-3 w-3" /> {fmt.toUpperCase()}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {a.messages.length > 0 && a.currentId && (
                  <button type="button" onClick={handleShare} disabled={isSharing} aria-label={t.shareConversation} title={t.shareConversation} className={cn(iconBtn, 'hidden sm:block')}>
                    {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  </button>
                )}
                <button type="button" onClick={() => setShowSettings((v) => !v)} aria-label={t.customInstructions} title={t.customInstructions}
                  className={cn(iconBtn, showSettings && 'bg-muted text-foreground')}>
                  <Settings className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => { const next = !memoryOpen; setMemoryOpen(next); if (next) void a.loadMemories(); }}
                  aria-label={t.memory} title={t.memory}
                  className={cn(iconBtn, 'relative', memoryOpen && 'bg-muted text-foreground')}>
                  <Brain className="h-4 w-4" />
                  {a.memories.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{a.memories.length}</span>
                  )}
                </button>
                {a.tokenLimit && (
                  <div className="hidden items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 sm:flex" title={`${a.tokenCount} / ${a.tokenLimit} ${t.messagesUsed}`}>
                    <span className="text-[10px] font-medium text-muted-foreground">{a.tokenCount}</span>
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (a.tokenCount / a.tokenLimit) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">/ {a.tokenLimit}</span>
                  </div>
                )}
                <button type="button" onClick={() => setShowShortcuts(true)} aria-label={t.shortcuts} title={t.shortcuts} className={cn(iconBtn, 'hidden sm:block')}>
                  <Keyboard className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? t.collapse : t.expand} title={expanded ? t.collapse : t.expand} className={cn(iconBtn)}>
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

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-b border-border/60 bg-muted/20">
                    <div className={cn('mx-auto p-3', expanded && 'w-full max-w-3xl')}>
                      <div className="mb-2 flex items-center gap-2">
                        <Settings className="h-3.5 w-3.5 text-primary" />
                        <p className="flex-1 text-xs font-semibold">{t.customInstructions}</p>
                      </div>
                      <textarea
                        value={a.customInstructions}
                        onChange={(e) => a.setCustomInstructions(e.target.value)}
                        placeholder={t.customInstructionsHint}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {renderTasks()}

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
                      {m.role === 'user' && i === a.messages.length - 2 && !a.isLoading && !a.tasks.some((task) => task.title === m.content) && (
                        <div className="flex justify-end pr-1">
                          <button type="button" onClick={() => void a.createTask(m.content, [
                            locale === 'ru' ? 'Уточнить цель и требования' : locale === 'hy' ? 'Հստակեցնել նպատակը և պահանջները' : 'Clarify goals and requirements',
                            locale === 'ru' ? 'Подготовить и проверить изменения' : locale === 'hy' ? 'Պատրաստել և ստուգել փոփոխությունները' : 'Prepare and verify changes',
                            locale === 'ru' ? 'Проверить результат и опубликовать' : locale === 'hy' ? 'Ստուգել արդյունքը և հրապարակել' : 'Review the result and publish',
                          ])}
                            className="rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                            {locale === 'ru' ? 'Создать план' : locale === 'hy' ? 'Ստեղծել պլան' : 'Create plan'}
                          </button>
                        </div>
                      )}
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
                      {m.role === 'assistant' && m.sources && m.sources.length > 0 && !a.isLoading && (
                        <div className="flex flex-col gap-1 pl-1">
                          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            <FileText className="h-3 w-3" /> {t.sources}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((s, si) => (
                              <span key={`${m.id}-src-${si}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">{si + 1}</span>
                                <span className="max-w-[220px] truncate">{s}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="flex flex-col gap-1 pl-1">
                          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            <Database className="h-3 w-3" /> {t.toolCalls}
                          </p>
                          <div className="space-y-1">
                            {m.toolCalls.map((tc, ti) => (
                              <div key={`${m.id}-tool-${ti}`} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px]">
                                {tc.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                {tc.status === 'done' && <Check className="h-3 w-3 text-emerald-500" />}
                                {tc.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                <span className="font-medium text-foreground">{tc.name}</span>
                                {tc.result && <span className="truncate text-muted-foreground">{tc.result}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.role === 'assistant' && m.imageUrl && !a.isLoading && (
                        <div className="flex flex-col gap-2 pl-1">
                          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            <ImagePlus className="h-3 w-3" /> {t.generateImage}
                          </p>
                          <div className="w-fit max-w-full overflow-hidden rounded-xl border border-border/60">
                            <Image src={m.imageUrl} alt="Generated" width={768} height={768} unoptimized className="h-auto max-w-full object-cover md:max-w-md" />
                          </div>
                        </div>
                      )}
                      {m.role === 'assistant' && m.webSearchResults && m.webSearchResults.length > 0 && !a.isLoading && (
                        <div className="flex flex-col gap-2 pl-1">
                          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            <Search className="h-3 w-3" /> {t.webSearchResults}
                          </p>
                          <div className="space-y-2">
                            {m.webSearchResults.slice(0, 5).map((result, ri) => (
                              <a key={`${m.id}-ws-${ri}`} href={result.url} target="_blank" rel="noopener noreferrer"
                                className="block rounded-lg border border-border/60 bg-card/60 p-3 text-xs transition-colors hover:border-primary/50 hover:bg-primary/5">
                                <p className="mb-1 font-semibold text-foreground">{result.title}</p>
                                <p className="mb-1.5 line-clamp-2 text-muted-foreground">{result.snippet}</p>
                                <p className="truncate text-[10px] text-primary/70">{result.url}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.role === 'assistant' && m.artifact && !a.isLoading && (
                        <div className="flex flex-col gap-2 pl-1">
                          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            <Code className="h-3 w-3" /> {t.artifact}
                          </p>
                          <button type="button" onClick={() => setArtifact({ id: m.id, title: t.artifact, type: m.artifact!.type as 'html' | 'react' | 'code' | 'markdown', content: m.artifact!.content })}
                            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20">
                            <Eye className="h-3.5 w-3.5" /> {t.artifactPreview}
                          </button>
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
                      {renderAction(m)}
                      {renderFeedback(m)}
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
                  {a.isLoading && (
                    <div className={cn('mb-2 flex flex-col gap-2', expanded && 'mx-auto w-full max-w-3xl')}>
                      <div className="flex items-center gap-2">
                        <StreamStatus status={a.streamStatus} thinkingLabel={t.statusThinking} writingLabel={t.statusWriting} fetchingLabel={t.statusFetching} />
                        {a.streamStatus === 'thinking' && (
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                      {a.streamStatus === 'thinking' && <PipelineTicker />}
                    </div>
                  )}
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
                    <AnimatePresence>
                      {showMention && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-border/70 bg-popover/95 shadow-2xl backdrop-blur-xl">
                          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t.mentionTitle}</p>
                          <div className="max-h-56 overflow-y-auto p-1 [scrollbar-width:thin]">
                            {mentionMatches.map((e, i) => {
                              const Icon = entityIcon(e.type);
                              return (
                                <button key={`${e.type}:${e.id}`} type="button"
                                  onMouseEnter={() => setMentionIdx(i)}
                                  onClick={() => runMention(e)}
                                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                                    i === mentionIdx ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-3.5 w-3.5" /></span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-foreground">{e.label}</span>
                                    {e.hint && <span className="block truncate text-[11px] text-muted-foreground/70">{e.hint}</span>}
                                  </span>
                                  {i === mentionIdx && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {a.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {a.attachments.map((attachment) => (
                          <div key={attachment.url} className="relative">
                            <Image src={attachment.url} alt={attachment.name} className="h-16 w-16 rounded-lg border border-border/70 object-cover" />
                            <button type="button" onClick={() => a.removeAttachment(attachment.url)} className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow" aria-label={t.cancel}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div ref={composerRef}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={cn('flex flex-col rounded-2xl border bg-card/60 px-2.5 py-2 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20',
                        isDragging ? 'border-primary/60 bg-primary/5' : 'border-border/70')}>
                      <div className="mb-1 flex items-center gap-0.5 overflow-x-auto border-b border-border/40 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button type="button" onClick={() => insertMarkdown('**', '**')} title="Bold" aria-label="Bold" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Bold className="h-3 w-3" /></button>
                        <button type="button" onClick={() => insertMarkdown('*', '*')} title="Italic" aria-label="Italic" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Italic className="h-3 w-3" /></button>
                        <button type="button" onClick={() => insertMarkdown('`', '`')} title="Code" aria-label="Code" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Code className="h-3 w-3" /></button>
                        <button type="button" onClick={() => insertMarkdown('- ')} title="List" aria-label="List" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><List className="h-3 w-3" /></button>
                        <button type="button" onClick={() => insertMarkdown('1. ')} title="Numbered list" aria-label="Numbered list" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><ListOrdered className="h-3 w-3" /></button>
                        <button type="button" onClick={() => insertMarkdown('> ')} title="Quote" aria-label="Quote" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Quote className="h-3 w-3" /></button>
                        <div className="flex-1" />
                        <input ref={attachmentInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void a.uploadAttachment(file); e.currentTarget.value = ''; }} />
                        <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={a.isUploading || a.attachments.length >= 3} aria-label="Attach image" title="Attach image (max 3, 10 MB each)"
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40">
                          {a.isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                        </button>
                      </div>
                      {isDragging && (
                        <div className="mb-1 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-3 text-xs text-primary/70">
                          {t.dropHere}
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                      <textarea ref={a.inputRef} value={a.input} onChange={(e) => a.setInput(e.target.value)}
                        onKeyDown={onComposerKey} onPaste={handlePaste}
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
                    </div>
                    <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">{t.shiftEnterHint}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas workspace (fullscreen only) */}
            {expanded && a.canvas.type !== 'none' && (
              <div className="hidden shrink-0 border-l border-border/60 md:flex">
                {renderCanvas()}
              </div>
            )}
            {/* Artifacts canvas (fullscreen only) */}
            {expanded && artifact && (
              <div className="hidden shrink-0 border-l border-border/60 md:flex md:w-96 lg:w-[28rem]">
                <ArtifactsCanvas
                  artifact={artifact}
                  onClose={() => setArtifact(null)}
                  dict={{
                    close: t.close,
                    preview: t.artifactPreview,
                    code: t.artifactCode,
                    copy: t.copy,
                    copied: t.copied,
                  }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
