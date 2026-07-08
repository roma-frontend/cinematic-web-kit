import 'server-only';

// Cloudflare Workers AI — edge-run inference on a generous free tier
// (10,000 "neurons"/day). Used for embeddings (semantic search) and lightweight
// chat/summarization without shipping a heavy SDK. Plain REST over fetch.
//
// Setup (free): dash.cloudflare.com → AI → Workers AI, create an API token with
// the "Workers AI" permission, then set:
//   CF_ACCOUNT_ID   (defaults to R2_ACCOUNT_ID — same Cloudflare account)
//   CF_AI_TOKEN     (API token with Workers AI access)
//
// Everything here is gated on workersAiConfigured(); callers must handle null so
// the app keeps working when it's not set up.

const DEFAULT_EMBED_MODEL = process.env.CF_AI_EMBED_MODEL || '@cf/baai/bge-base-en-v1.5';
const DEFAULT_CHAT_MODEL = process.env.CF_AI_CHAT_MODEL || '@cf/meta/llama-3.1-8b-instruct';

function creds() {
  const accountId = process.env.CF_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';
  const token = process.env.CF_AI_TOKEN || '';
  return { accountId, token };
}

/** True when Workers AI is configured (account id + token). */
export function workersAiConfigured(): boolean {
  const { accountId, token } = creds();
  return Boolean(accountId && token);
}

async function run<T>(model: string, body: unknown): Promise<T | null> {
  const { accountId, token } = creds();
  if (!accountId || !token) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result ?? null) as T | null;
  } catch {
    return null;
  }
}

/**
 * Embed one or more texts into vectors (for semantic search / similarity).
 * Returns an array of vectors aligned with the input, or null on failure.
 */
export async function embed(text: string | string[]): Promise<number[][] | null> {
  const inputs = Array.isArray(text) ? text : [text];
  const result = await run<{ data?: number[][] }>(DEFAULT_EMBED_MODEL, { text: inputs });
  return result?.data ?? null;
}

/** Cosine similarity between two equal-length vectors (helper for ranking). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Lightweight chat/summarization at the edge. Returns the assistant text, or
 * null on failure. For richer/OpenAI-compatible chat prefer lib/llm.ts.
 */
export async function edgeChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string | null> {
  const result = await run<{ response?: string }>(DEFAULT_CHAT_MODEL, { messages });
  return result?.response ?? null;
}
