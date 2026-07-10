import 'server-only';
import { getRawDb, newId } from '@/lib/db';

// Long-term memory for the Studio Assistant: durable facts/preferences the user
// shared (e.g. "my business is a coffee shop", "keep answers short"). Stored
// per platform user and mixed back into the system prompt so the assistant
// stays consistent across separate conversations. Kept on the raw SQLite handle
// (table in lib/db/index.ts MIGRATIONS), like assistant-store.

export interface AssistantMemory {
  id: string;
  content: string;
  createdAt: number;
}

/** Max facts kept per user; oldest are evicted once the cap is exceeded. */
export const MEMORY_CAP = 30;
/** Max characters kept per fact. */
export const MEMORY_MAX_LEN = 240;

/**
 * Pull `<REMEMBER>…</REMEMBER>` facts out of a raw model reply. Pure and
 * client-safe in behaviour (no DB): returns the deduped, trimmed, length-capped
 * list of facts (max 5 per reply) so both the server (persistence) and the
 * client (surfacing "remembered" chips) can reuse the exact same parse.
 */
export function extractMemoryFacts(raw: string): string[] {
  if (!raw) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<REMEMBER>\s*([\s\S]*?)\s*<\/REMEMBER>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const fact = m[1].replace(/\s+/g, ' ').trim().slice(0, MEMORY_MAX_LEN);
    if (!fact) continue;
    const key = fact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(fact);
    if (out.length >= 5) break;
  }
  return out;
}

/** Strip every `<REMEMBER>` tag (and any dangling / partial tag) from a reply. */
export function stripMemoryTags(raw: string): string {
  return raw
    .replace(/<REMEMBER>[\s\S]*?<\/REMEMBER>/gi, '')
    .replace(/<REMEMBER>[\s\S]*$/gi, '')
    // A partial tag still mid-stream, e.g. "<REMEMB" or "</REMEM".
    .replace(/<\/?(?:R|RE|REM|REME|REMEM|REMEMB|REMEMBE|REMEMBER>?)$/i, '');
}

export function listMemories(userId: string, limit = MEMORY_CAP): AssistantMemory[] {
  return getRawDb()
    .prepare(
      'SELECT id, content, created_at as createdAt FROM assistant_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .all(userId, limit) as AssistantMemory[];
}

/**
 * Add one fact for a user. Case-insensitive dedup (an existing match is left
 * untouched and returned) and a hard cap: once above MEMORY_CAP the oldest rows
 * are pruned. Returns the stored fact, or null when the input is empty.
 */
export function addMemory(userId: string, content: string): AssistantMemory | null {
  const fact = (content || '').replace(/\s+/g, ' ').trim().slice(0, MEMORY_MAX_LEN);
  if (!fact) return null;
  const db = getRawDb();
  const existing = db
    .prepare('SELECT id, content, created_at as createdAt FROM assistant_memory WHERE user_id = ? AND lower(content) = lower(?)')
    .get(userId, fact) as AssistantMemory | undefined;
  if (existing) return existing;
  const row: AssistantMemory = { id: newId('mem'), content: fact, createdAt: Date.now() };
  db.prepare('INSERT INTO assistant_memory (id, user_id, content, created_at) VALUES (?, ?, ?, ?)')
    .run(row.id, userId, row.content, row.createdAt);
  // Evict the oldest facts beyond the cap so memory stays bounded.
  db.prepare(
    `DELETE FROM assistant_memory WHERE user_id = ? AND id NOT IN (
       SELECT id FROM assistant_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
     )`,
  ).run(userId, userId, MEMORY_CAP);
  return row;
}

/** Persist a batch of facts (from a single reply); returns those newly stored. */
export function addMemories(userId: string, facts: string[]): AssistantMemory[] {
  const stored: AssistantMemory[] = [];
  for (const f of facts) {
    const before = memoryCount(userId);
    const row = addMemory(userId, f);
    // Only surface genuinely new rows (dedup returns the pre-existing one).
    if (row && memoryCount(userId) > before) stored.push(row);
  }
  return stored;
}

export function memoryCount(userId: string): number {
  const row = getRawDb()
    .prepare('SELECT count(*) as n FROM assistant_memory WHERE user_id = ?')
    .get(userId) as { n: number } | undefined;
  return row?.n ?? 0;
}

export function deleteMemory(userId: string, id: string): boolean {
  const res = getRawDb()
    .prepare('DELETE FROM assistant_memory WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return res.changes > 0;
}

export function clearMemories(userId: string): number {
  const res = getRawDb().prepare('DELETE FROM assistant_memory WHERE user_id = ?').run(userId);
  return res.changes;
}
