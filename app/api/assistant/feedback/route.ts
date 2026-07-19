import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { addFeedback } from '@/lib/assistant-feedback';
import { getUserEntitlements } from '@/lib/billing/entitlements';

export const runtime = 'nodejs';

// Record thumbs up/down feedback for an assistant message. Gated by the same
// paid capability as the chat itself.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!getUserEntitlements(user).has('assistant.use')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { messageId?: string; conversationId?: string; rating?: string; reason?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : '';
  const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null;
  if (!messageId || !rating) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const conversationId = typeof body.conversationId === 'string' && body.conversationId ? body.conversationId : undefined;
  const reason = typeof body.reason === 'string' ? body.reason : '';
  addFeedback(user.id, messageId, rating, reason, conversationId);
  return NextResponse.json({ ok: true });
}
