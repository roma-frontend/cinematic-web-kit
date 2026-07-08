import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { listMessages, renameConversation, deleteConversation, ownsConversation } from '@/lib/assistant-store';

export const runtime = 'nodejs';

// Messages of one conversation (owner only).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!ownsConversation(user.id, id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ messages: listMessages(user.id, id) });
}

// Rename a conversation.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  let title = '';
  try {
    title = String((await request.json())?.title ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!renameConversation(user.id, id, title)) {
    return NextResponse.json({ error: 'Not found or empty title' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// Delete a conversation (and its messages via cascade).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  if (!deleteConversation(user.id, id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
