import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { getRawDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return unauthorized();
  }

  try {
    const db = getRawDb();
    
    // Get total messages sent by user
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM assistant_messages m
      INNER JOIN assistant_conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND m.role = 'user'
    `).get(user.id) as { count: number };

    const used = result?.count || 0;
    
    // Default limit (can be configured per user/plan later)
    const limit = 1000;

    return NextResponse.json({ 
      used, 
      limit,
      remaining: Math.max(0, limit - used)
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
