import { NextResponse } from 'next/server';
import { THEMES, pickTheme, getTheme } from '@/lib/themes';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { chatComplete } from '@/lib/llm';

export const runtime = 'nodejs';

// Picks the best theme for a brief. Prefers an LLM classifier when configured
// (see lib/llm.ts — any OpenAI-compatible endpoint, e.g. free Groq), otherwise
// falls back to deterministic keyword matching (always available). Without an
// LLM the route still works, so nothing breaks.

const IDS = THEMES.map((t) => t.id);

async function classifyWithLLM(brief: string): Promise<string | null> {
  const catalog = THEMES.map((t) => `- ${t.id}: ${t.label} (${t.keywords.slice(0, 6).join(', ') || 'default'})`).join('\n');
  const system =
    'You classify a website brief into exactly ONE design theme id from the list. ' +
    'Reply with ONLY the id, nothing else.';
  const user = `Themes:\n${catalog}\n\nBrief: """${brief}"""\n\nBest theme id:`;

  const raw = await chatComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0, maxTokens: 12 },
  );
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return IDS.find((id) => lower.includes(id)) ?? null;
}

export async function POST(request: Request) {
  // May call the configured LLM on the server's key — signed-in users only.
  const user = await requireUser();
  if (!user) return unauthorized();
  const msgs = apiErrors(await getLocale());
  if (!rateLimit(`pick-theme:${user.id}`, 30)) {
    return NextResponse.json({ error: msgs.tooManyRequests }, { status: 429 });
  }
  let brief = '';
  try {
    const body = await request.json();
    brief = String(body?.brief ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const llmId = await classifyWithLLM(brief);
  if (llmId) {
    const t = getTheme(llmId);
    return NextResponse.json({ themeId: t.id, label: t.label, via: 'llm' });
  }
  const t = pickTheme(brief);
  return NextResponse.json({ themeId: t.id, label: t.label, via: 'keywords' });
}
