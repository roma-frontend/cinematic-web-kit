import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { isLocale, type Locale } from '@/lib/seo';
import { llmConfig, llmConfigured } from '@/lib/llm';
import { buildAssistantPrompt, type AssistantRole } from '@/lib/assistant-prompt';
import { addMessage, ownsConversation, assistantUsageToday, bumpAssistantUsage } from '@/lib/assistant-store';
import { listMemories, addMemories, extractMemoryFacts, stripMemoryTags } from '@/lib/assistant-memory';
import { getUserEntitlements } from '@/lib/billing/entitlements';

export const runtime = 'nodejs';

// Localized upsell copy for the plan gate / daily quota (kept inline — small
// and specific to this route, mirrors the auth routes' inline dict pattern).
const GATE = {
  ru: { locked: 'AI-ассистент доступен на планах Pro и Studio. Оформите подписку, чтобы им пользоваться.', quota: 'Дневной лимит сообщений исчерпан. Перейдите на Studio для безлимитного доступа.' },
  en: { locked: 'The AI assistant is available on the Pro and Studio plans. Upgrade to use it.', quota: 'You have reached today’s message limit. Upgrade to Studio for unlimited access.' },
  hy: { locked: 'AI օգնականը հասանելի է Pro և Studio պլաններում։ Բաժանորդագրվեք՝ օգտագործելու համար։', quota: 'Այսօրվա հաղորդագրությունների սահմանը սպառված է։ Անցեք Studio՝ անսահմանափակ հասանելիության համար։' },
} as const;

// Studio Assistant chat. Auth-gated (costly API) + rate-limited. Streams the
// model's reply as plain text using the OpenAI-compatible endpoint from lib/llm
// (e.g. free Groq). Without a configured model it returns 503 so the client can
// show a friendly "assistant unavailable" note.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const t = apiErrors(await getLocale());
  const gLocale: Locale = await getLocale();
  const g = GATE[gLocale] ?? GATE.en;

  // Plan gate: the assistant is a paid capability (Pro + Studio).
  const ent = getUserEntitlements(user);
  if (!ent.has('assistant.use')) {
    return NextResponse.json({ error: g.locked, feature: 'assistant.use', upgrade: '/pricing' }, { status: 403 });
  }

  if (!rateLimit(`assistant:${user.id}`, 30)) {
    return NextResponse.json({ error: t.tooManyRequests }, { status: 429 });
  }

  // Daily quota (Pro = capped, Studio/staff = unlimited via null limit).
  const dailyLimit = ent.limits.assistantDaily;
  if (dailyLimit != null && assistantUsageToday(user.id) >= dailyLimit) {
    return NextResponse.json(
      { error: g.quota, feature: 'assistant.use', upgrade: '/pricing', limit: dailyLimit },
      { status: 429 },
    );
  }

  if (!llmConfigured()) {
    return NextResponse.json({ error: 'assistant_unavailable' }, { status: 503 });
  }

  let body: { messages?: { role: string; content: string }[]; lang?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Sanitize history: keep the last 12 turns, cap each message length.
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const history = incoming
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 4000) }));
  if (history.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  const locale: Locale = isLocale(body.lang) ? body.lang : await getLocale();
  const role: AssistantRole =
    user.role === 'superadmin' || user.role === 'admin' ? user.role : 'customer';
  // Agentic actions (live DATA fetch) are Studio-only.
  const allowActions = ent.has('assistant.actions');
  const memories = listMemories(user.id).map((m) => m.content);
  const system = buildAssistantPrompt(locale, role, user.name || undefined, allowActions, memories);
  const { url, key, model } = llmConfig();

  // Count this message against the daily quota (no-op for unlimited plans, but
  // cheap and keeps a usage record for all users).
  bumpAssistantUsage(user.id);

  // Persist the newest user message now (if it belongs to the user's chat).
  const convId = typeof body.conversationId === 'string' ? body.conversationId : '';
  const persist = convId && ownsConversation(user.id, convId);
  if (persist) {
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    if (lastUser) addMessage(convId, 'user', lastUser.content);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.5,
        messages: [{ role: 'system', content: system }, ...history],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }

  // Transform the provider's SSE stream into a plain-text token stream.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();
  let buffer = '';
  let assistantFull = '';

  // Persist the assistant reply once (stripped of control tags) when the
  // stream finishes, so history reloads cleanly. Also harvest any <REMEMBER>
  // facts the model emitted into the user's long-term memory.
  const saveReply = () => {
    if (!assistantFull.trim()) return;
    const facts = extractMemoryFacts(assistantFull);
    if (facts.length) { try { addMemories(user.id, facts); } catch { /* memory is best-effort */ } }
    const clean = stripMemoryTags(assistantFull)
      .replace(/<NAVIGATE>[\s\S]*?<\/NAVIGATE>/g, '')
      .replace(/<SUGGEST>[\s\S]*?<\/SUGGEST>/g, '')
      .replace(/<DATA>[\s\S]*?<\/DATA>/g, '')
      .trim();
    if (persist && clean) addMessage(convId, 'assistant', clean.slice(0, 8000));
    assistantFull = '';
  };

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        saveReply();
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          saveReply();
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) {
            assistantFull += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          /* ignore keep-alive / partial lines */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
