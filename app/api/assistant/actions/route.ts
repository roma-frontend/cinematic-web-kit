import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { rateLimit } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getUserEntitlements } from '@/lib/billing/entitlements';
import { performAction, type AgentAction } from '@/lib/assistant-actions';
import { canProposeAction } from '@/lib/assistant-action-tags';
import type { AssistantRole } from '@/lib/assistant-routes';

export const runtime = 'nodejs';

function validateAction(obj: unknown): AgentAction | null {
  if (!obj || typeof obj !== 'object') return null;
  const a = obj as Record<string, unknown>;
  const kind = a.kind;
  if (kind === 'create_site') {
    const name = typeof a.name === 'string' ? a.name.trim() : '';
    if (!name) return null;
    const locale = typeof a.locale === 'string' ? a.locale : undefined;
    return { kind, name, locale: locale === 'ru' || locale === 'en' || locale === 'hy' ? locale : undefined };
  }
  if (kind === 'publish_site') {
    const siteId = typeof a.siteId === 'string' ? a.siteId.trim() : '';
    if (!siteId) return null;
    return { kind, siteId };
  }
  if (kind === 'invite_site_user') {
    const siteId = typeof a.siteId === 'string' ? a.siteId.trim() : '';
    const email = typeof a.email === 'string' ? a.email.trim() : '';
    if (!siteId || !email || !email.includes('@')) return null;
    return { kind, siteId, email, name: typeof a.name === 'string' ? a.name.trim() : undefined };
  }
  return null;
}

// Execute a confirmed agentic action on behalf of the user. The LLM may PROPOSE
// actions via an <ACTION> tag, but every mutation requires an explicit
// confirmation click in the client and is logged in the audit trail.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const t = apiErrors(await getLocale());

  // Plan gate: proposing/executing agentic actions is a Studio-only capability.
  if (!getUserEntitlements(user).has('assistant.actions')) {
    return NextResponse.json({ error: 'forbidden', feature: 'assistant.actions', upgrade: '/pricing' }, { status: 403 });
  }

  if (!rateLimit(`assistant-actions:${user.id}`, 20)) {
    return NextResponse.json({ error: t.tooManyRequests }, { status: 429 });
  }

  let body: { action?: unknown } = {};
  try { body = await request.json(); } catch { /* empty */ }

  const action = validateAction(body.action);
  if (!action) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const role: AssistantRole = user.role === 'superadmin' || user.role === 'admin' ? user.role : 'customer';
  if (!canProposeAction(role, action.kind)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const result = performAction(
    { id: user.id, email: user.email, role: user.role },
    action,
    await getLocale(),
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
