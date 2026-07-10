import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { getUserEntitlements } from '@/lib/billing/entitlements';
import { listMemories, deleteMemory, clearMemories } from '@/lib/assistant-memory';

export const runtime = 'nodejs';

// Manage the current user's long-term assistant memory (the durable facts the
// assistant recorded via <REMEMBER>). Gated by the same paid capability as the
// chat itself (assistant.use), so only assistant users can see/manage it.
function gate(user: Parameters<typeof getUserEntitlements>[0]) {
  return getUserEntitlements(user).has('assistant.use');
}

// List remembered facts (newest first).
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!gate(user)) return NextResponse.json({ memories: [] });
  return NextResponse.json({ memories: listMemories(user.id) });
}

// Delete one fact (?id=…) or clear them all (no id).
export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!gate(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (id) {
    const ok = deleteMemory(user.id, id);
    return NextResponse.json({ ok });
  }
  const removed = clearMemories(user.id);
  return NextResponse.json({ ok: true, removed });
}
