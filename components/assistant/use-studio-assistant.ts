'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/hooks/use-locale';
import { ASSISTANT_ROUTES, ASSISTANT_DATA_KEYS, type AssistantRole } from '@/lib/assistant-routes';
import type { MentionEntity } from '@/lib/assistant-commands';
import type { AssistantTask, AssistantTaskStepStatus } from '@/lib/assistant-task-core';
import { sitePreviewUrl, type MarkdownTable } from '@/lib/assistant-canvas';
import { speakText, stopSpeaking, isSpeaking as checkSpeaking, ttsSupported as checkTts } from '@/lib/assistant-tts';

import type { Locale } from '@/lib/seo';
import {
  parseActionTag,
  stripActionTags,
  summarizeAction,
  canProposeAction,
  type AgentAction,
  type PendingAction,
  type ActionResult,
} from '@/lib/assistant-action-tags';

export interface AssistantAttachment {
  url: string;
  kind: 'image' | 'video';
  name: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: AssistantAttachment[];
  suggestions?: string[];
  route?: string;
  createdAt?: number;
  /** Facts the assistant recorded to long-term memory in this reply. */
  remembered?: string[];
  /** Citation labels from internal docs used to ground this reply (staff). */
  sources?: string[];
  /** User-supplied thumbs up/down feedback for this assistant reply. */
  feedback?: { rating: 'up' | 'down'; reason?: string };
  /** Agentic action proposed by the assistant, awaiting user confirmation. */
  action?: PendingAction;
  /** Outcome after the user confirmed or dismissed the action. */
  actionResult?: ActionResult;
  /** Inline data table the assistant emitted in this reply. */
  dataMarkdown?: string;
  /** Tool/function calls made during this response. */
  toolCalls?: Array<{ name: string; status: 'running' | 'done' | 'error'; result?: string }>;
  /** Generated image URL (Pollinations.ai). */
  imageUrl?: string;
  /** Web search results. */
  webSearchResults?: Array<{ title: string; snippet: string; url: string; source: string }>;
  /** Artifact (code/HTML/React component). */
  artifact?: { type: string; content: string };
}

export type CanvasType = 'none' | 'preview' | 'data' | 'diff-theme';

export interface CanvasState {
  type: CanvasType;
  /** Site selected for live preview. */
  siteId?: string;
  siteSlug?: string;
  siteName?: string;
  /** Markdown table rendered from a <DATA> reply. */
  dataMarkdown?: string;
  /** Theme diff: previous theme id/label and proposed theme. */
  themeDiff?: {
    beforeId?: string;
    beforeLabel?: string;
    afterId: string;
    afterLabel: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryFact {
  id: string;
  content: string;
  createdAt: number;
}

interface SR extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

const ROUTE_SET = new Set<string>(ASSISTANT_ROUTES);
const DATA_SET = new Set<string>(ASSISTANT_DATA_KEYS);

function detectLanguage(text: string): Locale {
  const hy = (text.match(/[\u0530-\u058F]/g) || []).length;
  if (hy > text.length * 0.15) return 'hy';
  const cyr = (text.match(/[\u0400-\u04FF]/g) || []).length;
  return cyr > text.length * 0.2 ? 'ru' : 'en';
}

function parseTags(
  raw: string,
  role: AssistantRole,
): { clean: string; route: string | null; suggestions: string[]; data: string | null; remembered: string[]; sources: string[]; action: AgentAction | null; imagePrompt: string | null; webSearchQuery: string | null; artifact: { type: string; content: string } | null } {
  let route: string | null = null;
  const nav = raw.match(/<NAVIGATE>\s*([^<]+?)\s*<\/NAVIGATE>/);
  if (nav) {
    const p = nav[1].trim();
    if (ROUTE_SET.has(p)) route = p;
  }
  let data: string | null = null;
  const dat = raw.match(/<DATA>\s*([^<]+?)\s*<\/DATA>/);
  if (dat) {
    const k = dat[1].trim();
    if (DATA_SET.has(k)) data = k;
  }
  let suggestions: string[] = [];
  const sug = raw.match(/<SUGGEST>\s*([^<]*?)\s*<\/SUGGEST>/);
  if (sug) suggestions = sug[1].split('|').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  // Deterministic doc citations (staff RAG), emitted by the server up front.
  let sources: string[] = [];
  const src = raw.match(/<SOURCES>\s*([^<]*?)\s*<\/SOURCES>/);
  if (src) sources = src[1].split('|').map((s) => s.trim()).filter(Boolean).slice(0, 5);
  // Long-term memory facts (silent tag; surfaced as a subtle "remembered" note).
  const remembered: string[] = [];
  const remSeen = new Set<string>();
  const remRe = /<REMEMBER>\s*([\s\S]*?)\s*<\/REMEMBER>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = remRe.exec(raw)) !== null) {
    const fact = rm[1].replace(/\s+/g, ' ').trim();
    const key = fact.toLowerCase();
    if (fact && !remSeen.has(key)) { remSeen.add(key); remembered.push(fact); }
  }
  // Image generation prompt
  let imagePrompt: string | null = null;
  const img = raw.match(/<IMAGE>\s*([\s\S]*?)\s*<\/IMAGE>/);
  if (img) imagePrompt = img[1].trim().slice(0, 500);
  // Web search query
  let webSearchQuery: string | null = null;
  const ws = raw.match(/<WEB_SEARCH>\s*([\s\S]*?)\s*<\/WEB_SEARCH>/);
  if (ws) webSearchQuery = ws[1].trim().slice(0, 200);
  // Artifact (code/HTML/React)
  let artifact: { type: string; content: string } | null = null;
  const art = raw.match(/<ARTIFACT\s+type="([^"]+)">([\s\S]*?)<\/ARTIFACT>/);
  if (art) artifact = { type: art[1], content: art[2].trim() };
  // Agentic action: only the first well-formed block; role/locale checked by caller.
  const action = parseActionTag(raw);
  const clean = stripActionTags(raw)
    .replace(/<NAVIGATE>[\s\S]*?<\/NAVIGATE>/g, '')
    .replace(/<SUGGEST>[\s\S]*?<\/SUGGEST>/g, '')
    .replace(/<DATA>[\s\S]*?<\/DATA>/g, '')
    .replace(/<REMEMBER>[\s\S]*?<\/REMEMBER>/gi, '')
    .replace(/<SOURCES>[\s\S]*?<\/SOURCES>/gi, '')
    .replace(/<IMAGE>[\s\S]*?<\/IMAGE>/g, '')
    .replace(/<WEB_SEARCH>[\s\S]*?<\/WEB_SEARCH>/g, '')
    .replace(/<ARTIFACT[\s\S]*?<\/ARTIFACT>/g, '')
    .replace(/<NAVIGATE>[\s\S]*$/g, '')
    .replace(/<SUGGEST>[\s\S]*$/g, '')
    .replace(/<DATA>[\s\S]*$/g, '')
    .replace(/<REMEMBER>[\s\S]*$/gi, '')
    .replace(/<SOURCES>[\s\S]*$/gi, '')
    .replace(/<IMAGE>[\s\S]*$/g, '')
    .replace(/<WEB_SEARCH>[\s\S]*$/g, '')
    .replace(/<ARTIFACT[\s\S]*$/g, '')
    .replace(/<\/?(NAV|SUG|DAT|REMEMBER|SOURCES|ACTION|IMAGE|WEB_SEARCH|ARTIFACT)[A-Z]*$/i, '')
    .replace(/<\/?(?:R|RE|REM|REME|REMEM|REMEMB|REMEMBE)$/i, '')
    .replace(/<\/?(?:S|SO|SOU|SOUR|SOURC|SOURCE)$/i, '')
    .trimEnd();
  // Only the user's allowed role can see a proposed action; silently strip it otherwise.
  const allowedAction = action && canProposeAction(role, action.kind) ? action : null;
  return { clean, route, suggestions, data, remembered, sources, action: allowedAction, imagePrompt, webSearchQuery, artifact };
}

export function useStudioAssistant(role: AssistantRole = 'customer') {
  const router = useRouter();
  const { locale } = useLocale();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'thinking' | 'writing' | 'fetching'>('idle');
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [entities, setEntities] = useState<MentionEntity[]>([]);
  const [tasks, setTasks] = useState<AssistantTask[]>([]);
  const [canvas, setCanvas] = useState<CanvasState>({ type: 'none' });
  const [canvasBusy, setCanvasBusy] = useState(false);
  const tenantSiteIdRef = useRef<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [tokenCount, setTokenCount] = useState(0);
  const [tokenLimit, setTokenLimit] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [responseVariants, setResponseVariants] = useState<Record<string, string[]>>({});
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Live streaming controller so the user can cancel a reply mid-flight; the
  // partial text already received is kept (not discarded).
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const streamStatusRef = useRef(streamStatus);
  streamStatusRef.current = streamStatus;
  // Throttle streaming updates to prevent infinite re-renders
  const streamingContentRef = useRef<string>('');
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 100; // Update UI every 100ms

  const setStreamStatusIfChanged = useCallback((next: typeof streamStatus) => {
    if (streamStatusRef.current !== next) setStreamStatus(next);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/conversations');
      if (res.ok) setConversations((await res.json()).conversations ?? []);
    } catch { /* offline: history just stays empty */ }
  }, []);

  // ── Long-term memory (durable facts the assistant recorded via <REMEMBER>) ──
  const loadMemories = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/memory');
      if (res.ok) setMemories((await res.json()).memories ?? []);
    } catch { /* memory just stays empty */ }
  }, []);

  const forgetMemory = useCallback(async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try { await fetch(`/api/assistant/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); }
    catch { /* optimistic; ignore */ }
  }, []);

  const clearMemory = useCallback(async () => {
    setMemories([]);
    try { await fetch('/api/assistant/memory', { method: 'DELETE' }); }
    catch { /* optimistic; ignore */ }
  }, []);

  const loadTokenUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/usage');
      if (res.ok) {
        const data = await res.json();
        setTokenCount(data.used || 0);
        setTokenLimit(data.limit || null);
      }
    } catch {
      // Silently fail - token counter is optional
    }
  }, []);

  const newChat = useCallback(() => {
    setCurrentId(null);
    setMessages([]);
    setAttachments([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setError(null);
    setCurrentId(id);
    setLoadingConversation(true);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (res.ok) {
        const rows = (await res.json()).messages ?? [];
        setMessages(rows.map((m: { id: string; role: 'user' | 'assistant'; content: string; createdAt?: number }) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt })));
      }
    } catch { /* ignore */ }
    finally { setLoadingConversation(false); }
  }, []);

  const rename = useCallback(async (id: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: t } : c)));
    try {
      await fetch(`/api/assistant/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t }),
      });
    } catch { /* optimistic; ignore */ }
  }, []);

  const remove = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentId === id) { setCurrentId(null); setMessages([]); }
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE' });
    } catch { /* ignore */ }
  }, [currentId]);

  const voiceSupported = typeof window !== 'undefined' &&
    !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
       (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const startVoice = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (recRef.current) { recRef.current.stop(); recRef.current = null; setIsListening(false); return; }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = { ru: 'ru-RU', hy: 'hy-AM', en: 'en-US' }[locale] || 'en-US';
    recRef.current = rec;
    setIsListening(true);
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i]?.[0]?.transcript || '';
      setInput(text);
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (text.trim()) silenceRef.current = setTimeout(() => rec.stop(), 1100);
    };
    rec.onend = () => { if (silenceRef.current) clearTimeout(silenceRef.current); setIsListening(false); recRef.current = null; };
    rec.onerror = () => { setIsListening(false); recRef.current = null; };
    rec.start();
  }, [locale]);

  // Shared: stream an assistant reply for a full history ending in a user
  // message. Handles lazy conversation creation, persistence and tag parsing.
  const runStream = useCallback(async (history: AssistantMessage[], firstText: string) => {
    setIsLoading(true);
    setError(null);
    stoppedRef.current = false;
    setStreamStatusIfChanged('thinking');
    const controller = new AbortController();
    abortRef.current = controller;
    let convId = currentId;
    if (!convId) {
      try {
        const res = await fetch('/api/assistant/conversations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: firstText }),
          signal: controller.signal,
        });
        if (res.ok) {
          const conv = (await res.json()).conversation as Conversation;
          convId = conv.id; setCurrentId(conv.id); setConversations((prev) => [conv, ...prev]);
        }
      } catch { /* proceed without persistence (or aborted before we started) */ }
    }
    const assistantId = `a${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() }]);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content, attachments: m.attachments })),
          lang: detectLanguage(firstText),
          conversationId: convId ?? undefined,
        }),
        signal: controller.signal,
      });
      if (res.status === 503) { setUnavailable(true); setMessages((prev) => prev.filter((m) => m.id !== assistantId)); return; }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let hasToken = false;
      streamingContentRef.current = '';
      lastUpdateRef.current = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!hasToken && chunk.trim().length > 0) {
          hasToken = true;
          setStreamStatusIfChanged('writing');
        }
        full += chunk;
        const { clean } = parseTags(full, role);
        streamingContentRef.current = clean;
        // Throttle UI updates to prevent infinite re-renders
        const now = Date.now();
        if (now - lastUpdateRef.current >= UPDATE_INTERVAL) {
          lastUpdateRef.current = now;
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clean } : m)));
        }
      }
      // Final update with all parsed data
      const { clean, route, suggestions, data, remembered, sources, action: agentAction, imagePrompt, webSearchQuery, artifact } = parseTags(full, role);
      const pendingAction = agentAction ? { action: agentAction, summary: summarizeAction(agentAction, locale) } : undefined;
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? {
        ...m,
        content: clean,
        suggestions,
        route: route ?? undefined,
        remembered: remembered.length ? remembered : undefined,
        sources: sources.length ? sources : undefined,
        action: pendingAction,
        artifact: artifact ?? undefined,
      } : m)));
      // Pull the freshly saved facts into the managed memory list.
      if (remembered.length) void loadMemories();
      // If the model asked to SHOW a data set, fetch it and append a table.
      if (data) {
        setStreamStatusIfChanged('fetching');
        // Safety net: drop any table the model may have invented — only the
        // app-provided (real) table should appear.
        const intro = clean.split('\n').filter((ln) => !/^\s*\|.*\|\s*$/.test(ln)).join('\n').trim();
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: intro } : m)));
        try {
          const dres = await fetch('/api/assistant/data', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: data, lang: detectLanguage(firstText) }),
            signal: controller.signal,
          });
          if (dres.ok) {
            const md = (await dres.json()).markdown as string;
            if (md) {
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `${intro}\n\n${md}`.trim() } : m)));
              showCanvasData(md);
            }
          }
        } catch { /* keep the text answer even if data fetch fails */ }
      }
      // If the model asked to generate an image, fetch it from Pollinations.ai.
      if (imagePrompt) {
        setStreamStatusIfChanged('fetching');
        try {
          const imgRes = await fetch('/api/assistant/image', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: imagePrompt }),
            signal: controller.signal,
          });
          if (imgRes.ok) {
            const { imageUrl } = await imgRes.json() as { imageUrl: string };
            if (imageUrl) {
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, imageUrl } : m)));
            }
          }
        } catch { /* keep the text answer even if image generation fails */ }
      }
      // If the model asked to search the web, fetch results from DuckDuckGo.
      if (webSearchQuery) {
        setStreamStatusIfChanged('fetching');
        try {
          const wsRes = await fetch('/api/assistant/web-search', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: webSearchQuery }),
            signal: controller.signal,
          });
          if (wsRes.ok) {
            const { results } = await wsRes.json() as { results: Array<{ title: string; snippet: string; url: string; source: string }> };
            if (results && results.length > 0) {
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, webSearchResults: results } : m)));
            }
          }
        } catch { /* keep the text answer even if web search fails */ }
      }
      if (convId) setConversations((prev) => {
        const found = prev.find((c) => c.id === convId);
        if (!found) return prev;
        return [{ ...found, updatedAt: Date.now() }, ...prev.filter((c) => c.id !== convId)];
      });
    } catch (e) {
      // A user-initiated stop is not an error: keep whatever streamed so far,
      // but if nothing arrived, drop the empty placeholder bubble.
      if (stoppedRef.current || (e instanceof DOMException && e.name === 'AbortError')) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.trim() !== ''));
      } else {
        setError('error');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      }
    } finally {
      abortRef.current = null;
      setIsLoading(false);
      setStreamStatusIfChanged('idle');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentId, loadMemories, setStreamStatusIfChanged]);

  /** Cancel an in-flight reply; the partial text already streamed is kept. */
  const stop = useCallback(() => {
    stoppedRef.current = true;
    abortRef.current?.abort();
  }, []);

  const navigate = useCallback(async (route: string) => {
    if (route === '/studio/builder') {
      if (!tenantSiteIdRef.current) {
        try {
          const res = await fetch('/api/studio/context');
          if (res.ok) {
            const data = await res.json() as { tenant?: { id?: string } | null; superadmin?: boolean };
            tenantSiteIdRef.current = data.tenant?.id ?? null;
            if (!tenantSiteIdRef.current && data.superadmin) {
              const landRes = await fetch('/api/landing-site', { method: 'POST' });
              if (landRes.ok) {
                const landData = await landRes.json() as { id?: string };
                tenantSiteIdRef.current = landData.id ?? null;
              }
            }
          }
        } catch { /* fall through */ }
      }
      if (tenantSiteIdRef.current) {
        router.push(`/studio/builder?site=${encodeURIComponent(tenantSiteIdRef.current)}`);
        return;
      }
    }
    router.push(route);
  }, [router]);

  // ── Fullscreen canvas: live preview / data table / theme diff workspace ─────
  const openCanvasSite = useCallback((siteId: string, siteSlug: string, siteName: string) => {
    setCanvas({ type: 'preview', siteId, siteSlug, siteName });
  }, []);

  const showCanvasData = useCallback((dataMarkdown: string) => {
    setCanvas({ type: 'data', dataMarkdown });
  }, []);

  const closeCanvas = useCallback(() => { setCanvas({ type: 'none' }); }, []);

  const previewTheme = useCallback(async (siteId: string, instruction: string) => {
    setCanvasBusy(true);
    try {
      const res = await fetch('/api/assistant/preview-theme', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, instruction }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return payload?.error ?? 'preview_error';
      const current = canvas.type === 'preview' ? canvas : undefined;
      setCanvas({
        type: 'diff-theme',
        siteId,
        siteSlug: current?.siteSlug ?? entities.find((e) => e.type === 'site' && e.id === siteId)?.hint,
        siteName: current?.siteName,
        themeDiff: {
          beforeId: payload.beforeId,
          beforeLabel: payload.beforeLabel,
          afterId: payload.afterId,
          afterLabel: payload.afterLabel,
        },
      });
      return null;
    } catch {
      return 'network_error';
    } finally {
      setCanvasBusy(false);
    }
  }, [canvas, entities]);

  const commitTheme = useCallback(async (siteId: string, themeId: string) => {
    setCanvasBusy(true);
    try {
      const res = await fetch('/api/assistant/site-theme', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, themeId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: payload?.error ?? 'error' as string };
      return { ok: true, themeId: payload.themeId as string, label: payload.label as string };
    } catch {
      return { ok: false, error: 'network_error' as string };
    } finally {
      setCanvasBusy(false);
    }
  }, []);

  const uploadAttachment = useCallback(async (file: File) => {
    if (isUploading) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError('upload_error');
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url || data.kind !== 'image') throw new Error('upload_failed');
      setAttachments((prev) => [...prev, { url: data.url as string, kind: 'image' as const, name: file.name }].slice(0, 3));
    } catch {
      setError('upload_error');
    } finally {
      setIsUploading(false);
    }
  }, [isUploading]);

  const removeAttachment = useCallback((url: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.url !== url));
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || isUploading) return;
    setError(null);
    const userMsg: AssistantMessage = { id: `u${Date.now()}`, role: 'user', content: trimmed || 'Проанализируй это изображение.', attachments, createdAt: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setAttachments([]);
    await runStream(history, userMsg.content);
  }, [attachments, isLoading, isUploading, messages, runStream]);

  // Inline edit of a sent user message: replace its text, drop everything after
  // it, and regenerate the assistant reply from that point.
  const editMessage = useCallback(async (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    const idx = messages.findIndex((m) => m.id === id);
    if (idx < 0 || messages[idx].role !== 'user') return;
    setError(null);
    const history = [...messages.slice(0, idx), { ...messages[idx], content: trimmed }];
    setMessages(history);
    await runStream(history, trimmed);
  }, [isLoading, messages, runStream]);

  // Regenerate an assistant reply: rewind to the user message that produced it
  // and re-run the stream, so a fresh answer replaces the old one.
  const regenerate = useCallback(async (assistantId: string) => {
    if (isLoading) return;
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx < 0 || messages[idx].role !== 'assistant') return;
    // Find the user message immediately preceding this assistant reply.
    let userIdx = idx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx -= 1;
    if (userIdx < 0) return;
    setError(null);
    const history = messages.slice(0, userIdx + 1);
    setMessages(history);
    await runStream(history, messages[userIdx].content);
  }, [isLoading, messages, runStream]);

  // Submit thumbs up/down feedback for an assistant message.
  const sendFeedback = useCallback(async (messageId: string, rating: 'up' | 'down', reason = '') => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: { rating, reason } } : m)));
    try {
      await fetch('/api/assistant/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, conversationId: currentId ?? undefined, rating, reason }),
      });
    } catch { /* optimistic; ignore network errors */ }
  }, [currentId]);

  // Confirm a proposed agentic action. The server performs the mutation, logs
  // audit, and returns the outcome; we surface it on the originating message.
  const confirmAction = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.action) return;
    try {
      const res = await fetch('/api/assistant/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: msg.action.action }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = (await res.json()) as ActionResult;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionResult: result } : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionResult: { ok: false, message: 'network_error' } } : m)));
    }
  }, [messages]);

  const dismissAction = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionResult: { ok: false, message: 'cancelled' } } : m)));
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/tasks');
      if (res.ok) setTasks((await res.json()).tasks ?? []);
    } catch { /* tasks stay empty offline */ }
  }, []);

  const createTask = useCallback(async (title: string, steps: string[]) => {
    if (tasks.some((task) => task.title === title && task.status !== 'cancelled')) return;
    try {
      const res = await fetch('/api/assistant/tasks', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, steps }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.task) setTasks((prev) => [data.task, ...prev]);
    } catch { /* task creation can be retried */ }
  }, [tasks]);

  const cancelTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/assistant/tasks?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' });
      if (res.ok) setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch { /* task remains visible until next refresh */ }
  }, []);

  const updateTaskStep = useCallback(async (taskId: string, stepId: string, status: AssistantTaskStepStatus) => {
    try {
      const res = await fetch('/api/assistant/tasks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, stepId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.task) setTasks((prev) => prev.map((task) => task.id === taskId ? data.task : task));
    } catch { /* keep current UI state until next refresh */ }
  }, []);

  const loadEntities = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/entities');
      if (res.ok) setEntities((await res.json()).entities ?? []);
    } catch { /* offline: entity picker stays empty */ }
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); return; }
    speakText(text, locale, () => setIsSpeaking(false));
    setIsSpeaking(true);
  }, [isSpeaking, locale]);

  const ttsSupported = checkTts();

  const addResponseVariant = useCallback((messageId: string, content: string) => {
    setResponseVariants((prev) => {
      const existing = prev[messageId] ?? [];
      if (existing.includes(content)) return prev;
      return { ...prev, [messageId]: [...existing, content] };
    });
  }, []);

  useEffect(() => {
    fetch('/api/studio/context')
      .then(async (r) => r.ok ? r.json() : null)
      .then((data) => { tenantSiteIdRef.current = data?.tenant?.id ?? null; })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cwk:assistant:custom-instructions');
      if (saved) setCustomInstructions(saved);
      const pinned = localStorage.getItem('cwk:assistant:pinned');
      if (pinned) setPinnedIds(new Set(JSON.parse(pinned)));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('cwk:assistant:custom-instructions', customInstructions); } catch {}
  }, [customInstructions]);

  useEffect(() => {
    try { localStorage.setItem('cwk:assistant:pinned', JSON.stringify([...pinnedIds])); } catch {}
  }, [pinnedIds]);

  // Load conversation history once on mount.
  useEffect(() => { void loadConversations(); void loadMemories(); void loadEntities(); void loadTasks(); void loadTokenUsage(); }, [loadConversations, loadMemories, loadEntities, loadTasks, loadTokenUsage]);

  return {
    messages, conversations, currentId, input, setInput, attachments, isUploading, uploadAttachment, removeAttachment, isLoading, loadingConversation, isListening, unavailable, error,
    voiceSupported, inputRef, send, editMessage, regenerate, stop, navigate, startVoice,
    loadConversations, newChat, selectConversation, rename, remove,
    memories, loadMemories, forgetMemory, clearMemory,
    sendFeedback,
    streamStatus,
    entities,
    tasks,
    loadTasks,
    createTask,
    cancelTask,
    updateTaskStep,
    confirmAction,
    dismissAction,
    canvas,
    canvasBusy,
    openCanvasSite,
    closeCanvas,
    previewTheme,
    commitTheme,
    pinnedIds,
    togglePin,
    tokenCount,
    tokenLimit,
    isSpeaking,
    speak,
    ttsSupported,
    customInstructions,
    setCustomInstructions,
    responseVariants,
    addResponseVariant,
  };
}
