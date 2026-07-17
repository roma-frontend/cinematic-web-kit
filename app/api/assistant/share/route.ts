import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { getRawDb, newId } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const { conversationId } = await request.json();
    
    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const db = getRawDb();

    // Verify user owns this conversation
    const conversation = db.prepare(
      'SELECT id, title FROM assistant_conversations WHERE id = ? AND user_id = ?'
    ).get(conversationId, user.id) as { id: string; title: string } | undefined;

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if share already exists
    const existing = db.prepare(
      'SELECT share_token FROM assistant_shares WHERE conversation_id = ?'
    ).get(conversationId) as { share_token: string } | undefined;

    if (existing) {
      return NextResponse.json({ shareToken: existing.share_token });
    }

    // Create new share
    const shareToken = newId('share');
    const now = Date.now();

    db.prepare(
      'INSERT INTO assistant_shares (share_token, conversation_id, user_id, created_at) VALUES (?, ?, ?, ?)'
    ).run(shareToken, conversationId, user.id, now);

    return NextResponse.json({ shareToken });
  } catch (error) {
    console.error('Share conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to share conversation' },
      { status: 500 }
    );
  }
}
