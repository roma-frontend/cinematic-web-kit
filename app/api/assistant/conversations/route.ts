import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { createConversation, listConversations, deriveTitle } from '@/lib/assistant-store';
import { chatComplete, llmConfigured } from '@/lib/llm';

export const runtime = 'nodejs';

// List the current user's assistant conversations (newest first).
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return NextResponse.json({ conversations: listConversations(user.id) });
}

// Ask the model for a short, logical title that captures the intent of the
// request (not just its first words). Falls back to a truncated derive when the
// LLM is unconfigured, slow, or returns something unusable.
async function smartTitle(firstMessage: string): Promise<string> {
  const fallback = deriveTitle(firstMessage);
  if (!llmConfigured()) return fallback;
  const raw = await chatComplete(
    [
      {
        role: 'system',
        content:
          'Generate a concise chat title (3–6 words) that captures the ESSENCE/intent of the user request — not its first words. ' +
          'Reply in the SAME language as the request. No quotes, no trailing punctuation, no prefixes like "Title:". Output only the title.',
      },
      { role: 'user', content: firstMessage.slice(0, 500) },
    ],
    { temperature: 0.3, maxTokens: 24, timeoutMs: 8000 },
  );
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/["'“”«»`]/g, '')
    .replace(/^(title|заголовок|վերնագիր)\s*[:\-–]\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?;,]+$/, '')
    .trim();
  if (!cleaned) return fallback;
  const clipped = cleaned.length > 60 ? `${cleaned.slice(0, 59).trimEnd()}…` : cleaned;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

// Create a conversation. Title is derived from the first message when provided.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  let body: { title?: string; firstMessage?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }
  const title = body.title?.trim()
    || (body.firstMessage ? await smartTitle(body.firstMessage) : 'New chat');
  const conversation = createConversation(user.id, title);
  return NextResponse.json({ conversation });
}
