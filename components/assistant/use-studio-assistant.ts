'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/hooks/use-locale';
import { ASSISTANT_ROUTES, ASSISTANT_DATA_KEYS } from '@/lib/assistant-routes';
import type { Locale } from '@/lib/seo';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  route?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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

function parseTags(raw: string): { clean: string; route: string | null; suggestions: string[]; data: string | null } {
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
  const clean = raw
    .replace(/<NAVIGATE>[\s\S]*?<\/NAVIGATE>/g, '')
    .replace(/<SUGGEST>[\s\S]*?<\/SUGGEST>/g, '')
    .replace(/<DATA>[\s\S]*?<\/DATA>/g, '')
    .replace(/<NAVIGATE>[\s\S]*$/g, '')
    .replace(/<SUGGEST>[\s\S]*$/g, '')
    .replace(/<DATA>[\s\S]*$/g, '')
    .replace(/<\/?(NAV|SUG|DAT)[A-Z]*$/i, '')
    .trimEnd();
  return { clean, route, suggestions, data };
}

export function useStudioAssistant() {
  const router = useRouter();
  const { locale } = useLocale();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/conversations');
      if (res.ok) setConversations((await res.json()).conversations ?? []);
    } catch { /* offline: history just stays empty */ }
  }, []);

  const newChat = useCallback(() => {
    setCurrentId(null);
    setMessages([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setError(null);
    setCurrentId(id);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (res.ok) {
        const rows = (await res.json()).messages ?? [];
        setMessages(rows.map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({ id: m.id, role: m.role, content: m.content })));
      }
    } catch { /* ignore */ }
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
    let convId = currentId;
    if (!convId) {
      try {
        const res = await fetch('/api/assistant/conversations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: firstText }),
        });
        if (res.ok) {
          const conv = (await res.json()).conversation as Conversation;
          convId = conv.id; setCurrentId(conv.id); setConversations((prev) => [conv, ...prev]);
        }
      } catch { /* proceed without persistence */ }
    }
    const assistantId = `a${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          lang: detectLanguage(firstText),
          conversationId: convId ?? undefined,
        }),
      });
      if (res.status === 503) { setUnavailable(true); setMessages((prev) => prev.filter((m) => m.id !== assistantId)); return; }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const { clean } = parseTags(full);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clean } : m)));
      }
      const { clean, route, suggestions, data } = parseTags(full);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clean, suggestions, route: route ?? undefined } : m)));
      // If the model asked to SHOW a data set, fetch it and append a table.
      if (data) {
        // Safety net: drop any table the model may have invented — only the
        // app-provided (real) table should appear.
        const intro = clean.split('\n').filter((ln) => !/^\s*\|.*\|\s*$/.test(ln)).join('\n').trim();
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: intro } : m)));
        try {
          const dres = await fetch('/api/assistant/data', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: data, lang: detectLanguage(firstText) }),
          });
          if (dres.ok) {
            const md = (await dres.json()).markdown as string;
            if (md) setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: `${intro}\n\n${md}`.trim() } : m)));
          }
        } catch { /* keep the text answer even if data fetch fails */ }
      }
      if (convId) setConversations((prev) => {
        const found = prev.find((c) => c.id === convId);
        if (!found) return prev;
        return [{ ...found, updatedAt: Date.now() }, ...prev.filter((c) => c.id !== convId)];
      });
    } catch {
      setError('error');
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentId]);

  /** Navigate to an in-app route (used by clickable links in replies). */
  const navigate = useCallback((route: string) => { router.push(route); }, [router]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setError(null);
    const userMsg: AssistantMessage = { id: `u${Date.now()}`, role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    await runStream(history, trimmed);
  }, [isLoading, messages, runStream]);

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

  // Load conversation history once on mount.
  useEffect(() => { void loadConversations(); }, [loadConversations]);

  return {
    messages, conversations, currentId, input, setInput, isLoading, isListening, unavailable, error,
    voiceSupported, inputRef, send, editMessage, navigate, startVoice,
    loadConversations, newChat, selectConversation, rename, remove,
  };
}
