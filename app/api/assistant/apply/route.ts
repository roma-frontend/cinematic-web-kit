import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit, isStaff } from '@/lib/auth';
import { enforceFeature } from '@/lib/billing/enforce';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { classifyInstruction } from '@/lib/assistant-apply';

export const runtime = 'nodejs';

// In-builder AI agent: turns a natural-language instruction into ONE safe,
// structured action the builder client can apply to the live document:
//   { kind: 'theme', themeId }      — restyle the whole site
//   { kind: 'regenerate' }          — rewrite the current page from the brief
//   { kind: 'chat', message }       — a short helpful reply (no edit)
// The set is intentionally small and safe (no free-form doc mutation), so the
// model can never corrupt the document. Gated by the paid assistant feature.

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const t = apiErrors(await getLocale());
  const locale = await getLocale();
  if (!isStaff(user)) {
    const gate = enforceFeature(user, 'assistant.use', t.forbidden);
    if (gate) return gate;
  }
  if (!rateLimit(`assistant-apply:${user.id}`, 20)) {
    return NextResponse.json({ error: t.tooManyRequests }, { status: 429 });
  }
  let instruction = '';
  let selected: { type: string; props: Record<string, string> } | undefined;
  let pageTitle = '';
  try {
    const body = await request.json();
    instruction = String(body?.instruction ?? '').slice(0, 500);
    pageTitle = typeof body?.pageTitle === 'string' ? body.pageTitle.slice(0, 160) : '';
    if (body?.selected && typeof body.selected.type === 'string' && body.selected.props && typeof body.selected.props === 'object') {
      const props = Object.fromEntries(
        Object.entries(body.selected.props as Record<string, unknown>)
          .filter(([key, value]) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(key) && typeof value === 'string')
          .slice(0, 80)
          .map(([key, value]) => [key, String(value).slice(0, 4000)]),
      );
      selected = { type: body.selected.type.slice(0, 80), props };
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!instruction.trim()) return NextResponse.json({ error: t.badRequest }, { status: 400 });

  const contextInstruction = pageTitle ? `${instruction}\n\nCurrent page title: ${pageTitle}` : instruction;
  const action = await classifyInstruction(contextInstruction, locale, selected);
  return NextResponse.json({ ok: true, action });
}
