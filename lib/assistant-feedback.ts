import 'server-only';
import { getRawDb, newId } from '@/lib/db';

export type FeedbackRating = 'up' | 'down';

export interface AssistantFeedback {
  id: string;
  userId: string;
  conversationId?: string;
  messageId: string;
  rating: FeedbackRating;
  reason: string;
  createdAt: number;
}

export function addFeedback(
  userId: string,
  messageId: string,
  rating: FeedbackRating,
  reason = '',
  conversationId?: string,
): AssistantFeedback {
  const db = getRawDb();
  const row: AssistantFeedback = {
    id: newId('af'),
    userId,
    conversationId,
    messageId,
    rating,
    reason: reason.slice(0, 500).trim(),
    createdAt: Date.now(),
  };
  db.prepare(
    `INSERT INTO assistant_feedback (id, user_id, conversation_id, message_id, rating, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.userId, row.conversationId ?? null, row.messageId, row.rating, row.reason, row.createdAt);
  return row;
}

export function feedbackForMessages(userId: string, messageIds: string[]): Map<string, AssistantFeedback> {
  if (messageIds.length === 0) return new Map();
  const placeholders = messageIds.map(() => '?').join(',');
  const rows = getRawDb()
    .prepare(
      `SELECT id, user_id as userId, conversation_id as conversationId, message_id as messageId,
              rating, reason, created_at as createdAt
       FROM assistant_feedback
       WHERE user_id = ? AND message_id IN (${placeholders})
       ORDER BY created_at DESC`,
    )
    .all(userId, ...messageIds) as AssistantFeedback[];
  const latest = new Map<string, AssistantFeedback>();
  for (const r of rows) {
    if (!latest.has(r.messageId)) latest.set(r.messageId, r);
  }
  return latest;
}
