import { NextResponse } from 'next/server';
import { THEMES, pickTheme, getTheme } from '@/lib/themes';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Picks the best theme for a brief. Prefers an LLM classifier when configured,
// otherwise falls back to deterministic keyword matching (always available).
//
// LLM is optional and OpenAI-compatible — set in the environment:
//   THEME_LLM_URL   e.g. https://api.muapi.ai/v1/chat/completions
//   THEME_LLM_KEY   API key (Bearer)
//   THEME_LLM_MODEL e.g. gpt-4o-mini
// Without these, the route still works (keyword mode), so nothing breaks.

const IDS = THEMES.map((t) => t.id);

async function classifyWithLLM(brief: string): Promise<string | null> {
  const url = process.env.THEME_LLM_URL;
  const key = process.env.THEME_LLM_KEY;
  const model = process.env.THEME_LLM_MODEL || 'gpt-4o-mini';
  if (!url || !key) return null;

  const catalog = THEMES.map((t) => `- ${t.id}: ${t.label} (${t.keywords.slice(0, 6).join(', ') || 'default'})`).join('\n');
  const system =
    'You classify a website brief into exactly ONE design theme id from the list. ' +
    'Reply with ONLY the id, nothing else.';
  const user = `Themes:\n${catalog}\n\nBrief: """${brief}"""\n\nBest theme id:`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 12,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = String(data?.choices?.[0]?.message?.content ?? '').toLowerCase();
    return IDS.find((id) => raw.includes(id)) ?? null;
  } catch {
    return null;
  }
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
