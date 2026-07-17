import { NextResponse } from 'next/server';
import { getRawDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    const db = getRawDb();

    // Get shared conversation
    const conversation = db.prepare(`
      SELECT c.id, c.title, c.created_at as createdAt
      FROM assistant_conversations c
      INNER JOIN assistant_shares s ON c.id = s.conversation_id
      WHERE s.share_token = ?
    `).get(token) as { id: string; title: string; createdAt: number } | undefined;

    if (!conversation) {
      return NextResponse.json(
        { error: 'Shared conversation not found' },
        { status: 404 }
      );
    }

    // Get messages
    const messages = db.prepare(`
      SELECT id, role, content, created_at as createdAt
      FROM assistant_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(conversation.id) as Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: number;
    }>;

    return NextResponse.json({
      conversation,
      messages
    });
  } catch (error) {
    console.error('Get shared conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared conversation' },
      { status: 500 }
    );
  }
}
