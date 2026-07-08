import 'server-only';
import { getRawDb, newId } from '@/lib/db';

// Persistence for Studio Assistant chat history. Uses the raw SQLite handle
// (tables live in lib/db/index.ts MIGRATIONS) so it stays isolated from the
// drizzle schema. Everything is scoped to the owning platform user.

export interface AssistantConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

/** Derive a short, logical conversation title from the first user message. */
export function deriveTitle(text: string): string {
  const cleaned = text
    .replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}\uFE0F]/gu, '') // strip emoji
    .replace(/[#*_`>~|]/g, '') // strip markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'New chat';
  const clipped = cleaned.length > 48 ? `${cleaned.slice(0, 47).trimEnd()}…` : cleaned;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

export function createConversation(userId: string, title: string): AssistantConversation {
  const db = getRawDb();
  const now = Date.now();
  const id = newId('ac');
  const t = (title || '').trim().slice(0, 120) || 'New chat';
  db.prepare(
    'INSERT INTO assistant_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, userId, t, now, now);
  return { id, title: t, createdAt: now, updatedAt: now };
}

export function listConversations(userId: string, limit = 100): AssistantConversation[] {
  return getRawDb()
    .prepare(
      'SELECT id, title, created_at as createdAt, updated_at as updatedAt FROM assistant_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
    )
    .all(userId, limit) as AssistantConversation[];
}

/** True when the conversation exists AND belongs to the user. */
export function ownsConversation(userId: string, id: string): boolean {
  const row = getRawDb()
    .prepare('SELECT 1 FROM assistant_conversations WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return Boolean(row);
}

export function listMessages(userId: string, conversationId: string): StoredMessage[] {
  if (!ownsConversation(userId, conversationId)) return [];
  return getRawDb()
    .prepare(
      'SELECT id, role, content, created_at as createdAt FROM assistant_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    )
    .all(conversationId) as StoredMessage[];
}

export function addMessage(conversationId: string, role: 'user' | 'assistant', content: string): void {
  const db = getRawDb();
  const now = Date.now();
  db.prepare(
    'INSERT INTO assistant_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(newId('am'), conversationId, role, content, now);
  db.prepare('UPDATE assistant_conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);
}

export function renameConversation(userId: string, id: string, title: string): boolean {
  const t = (title || '').trim().slice(0, 120);
  if (!t) return false;
  const res = getRawDb()
    .prepare('UPDATE assistant_conversations SET title = ?, updated_at = updated_at WHERE id = ? AND user_id = ?')
    .run(t, id, userId);
  return res.changes > 0;
}

export function deleteConversation(userId: string, id: string): boolean {
  const res = getRawDb()
    .prepare('DELETE FROM assistant_conversations WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return res.changes > 0;
}
