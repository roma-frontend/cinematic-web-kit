import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { isLocale, type Locale } from '@/lib/seo';
import { llmConfig, llmConfigured } from '@/lib/llm';
import { buildAssistantPrompt, type AssistantRole } from '@/lib/assistant-prompt';
import { addMessage, ownsConversation } from '@/lib/assistant-store';

export const runtime = 'nodejs';

// Studio Assistant chat. Auth-gated (costly API) + rate-limited. Streams the
// model's reply as plain text using the OpenAI-compatible endpoint from lib/llm
// (e.g. free Groq). Without a configured model it returns 503 so the client can
// show a friendly "assistant unavailable" note.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const t = apiErrors(await getLocale());
  if (!rateLimit(`assistant:${user.id}`, 30)) {
    return NextResponse.json({ error: t.tooManyRequests }, { status: 429 });
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
  const system = buildAssistantPrompt(locale, role, user.name || undefined);
  const { url, key, model } = llmConfig();

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
  // stream finishes, so history reloads cleanly.
  const saveReply = () => {
    if (!persist || !assistantFull.trim()) return;
    const clean = assistantFull
      .replace(/<NAVIGATE>[\s\S]*?<\/NAVIGATE>/g, '')
      .replace(/<SUGGEST>[\s\S]*?<\/SUGGEST>/g, '')
      .replace(/<DATA>[\s\S]*?<\/DATA>/g, '')
      .trim();
    if (clean) addMessage(convId, 'assistant', clean.slice(0, 8000));
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
