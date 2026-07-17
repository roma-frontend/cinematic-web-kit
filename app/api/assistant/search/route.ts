import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { getRawDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = getRawDb();
    const results = db.prepare(`
      SELECT 
        m.id as messageId,
        m.conversation_id as conversationId,
        m.role,
        m.content,
        m.created_at as createdAt,
        c.title as conversationTitle
      FROM assistant_messages m
      INNER JOIN assistant_conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all(user.id, `%${query}%`) as Array<{
      messageId: string;
      conversationId: string;
      role: string;
      content: string;
      createdAt: number;
      conversationTitle: string;
    }>;

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
