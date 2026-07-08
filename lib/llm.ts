import 'server-only';

// Shared OpenAI-compatible LLM client. One place to configure a chat model for
// the whole app (theme classification, page/copy generation, future chat).
//
// Provider-agnostic — point it at ANY OpenAI-compatible /chat/completions
// endpoint via env. Recommended free option: Groq (30 req/min, no card):
//   THEME_LLM_URL=https://api.groq.com/openai/v1/chat/completions
//   THEME_LLM_KEY=gsk_...
//   THEME_LLM_MODEL=llama-3.3-70b-versatile
// Other drop-ins: OpenAI, OpenRouter, Together, muapi, local Ollama, etc.
//
// The env names keep the historical THEME_LLM_* prefix for backward
// compatibility; LLM_* aliases are also accepted. With nothing configured
// llmConfigured() is false and callers fall back to their deterministic paths,
// so the app always works offline / key-less.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Request strict JSON output when the provider supports response_format. */
  json?: boolean;
  /** Abort the request after this many ms (default 20s). */
  timeoutMs?: number;
}

function config() {
  const url = process.env.LLM_URL || process.env.THEME_LLM_URL || '';
  const key = process.env.LLM_KEY || process.env.THEME_LLM_KEY || '';
  const model = process.env.LLM_MODEL || process.env.THEME_LLM_MODEL || 'gpt-4o-mini';
  return { url, key, model };
}

/** True when a chat model is configured — gates every LLM-powered feature. */
export function llmConfigured(): boolean {
  const { url, key } = config();
  return Boolean(url && key);
}

/**
 * Call the configured chat model. Returns the assistant message text, or null
 * on any failure (not configured, network error, bad status, timeout) so
 * callers can fall back gracefully. Never throws.
 */
export async function chatComplete(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string | null> {
  const { url, key, model } = config();
  if (!url || !key) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.4,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}
