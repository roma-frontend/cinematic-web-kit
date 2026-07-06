// Per-user UI preferences persisted in the DB (user_prefs, one JSON object per
// user). Theme, locale, dashboard view state, builder editor chrome — anything
// the UI wants to remember across browsers and devices. The shape is an open
// string→JSON map: the client owns the keys, the server only guards size and
// types so one runaway client can't bloat the DB.

import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb, userPrefs } from '@/lib/db';

export type PrefValue = string | number | boolean | string[] | Record<string, unknown>;
export type Prefs = Record<string, PrefValue>;

/** Hard caps: a prefs blob is UI state, not a data store. */
export const MAX_PREFS_BYTES = 32 * 1024;
export const MAX_KEY_LENGTH = 120;

/** All stored preferences for a user ({} when none were ever saved). */
export function getUserPrefs(userId: string): Prefs {
  const row = getDb().select().from(userPrefs).where(eq(userPrefs.userId, userId)).get();
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.prefs);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isValidValue(v: unknown): boolean {
  if (v === null) return true; // null = delete the key
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (Array.isArray(v)) return v.every((x) => typeof x === 'string');
  // one level of plain object (e.g. the builder editor chrome snapshot)
  return t === 'object';
}

/**
 * Shallow-merge a patch into the user's prefs; `null` values delete their key.
 * Returns the merged prefs, or an error string when the patch is rejected
 * (bad shape, oversized keys/blob) — the stored data is never partially written.
 */
export function patchUserPrefs(userId: string, patch: Record<string, unknown>): Prefs | string {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return 'Патч должен быть объектом.';
  const entries = Object.entries(patch);
  for (const [key, value] of entries) {
    if (!key || key.length > MAX_KEY_LENGTH) return `Недопустимый ключ настроек: "${key.slice(0, 40)}…"`;
    if (!isValidValue(value)) return `Недопустимое значение для ключа "${key}".`;
  }

  const merged = getUserPrefs(userId);
  for (const [key, value] of entries) {
    if (value === null) delete merged[key];
    else merged[key] = value as PrefValue;
  }

  const json = JSON.stringify(merged);
  if (json.length > MAX_PREFS_BYTES) return 'Настройки слишком объёмные.';

  const now = new Date();
  getDb()
    .insert(userPrefs)
    .values({ userId, prefs: json, updatedAt: now })
    .onConflictDoUpdate({ target: userPrefs.userId, set: { prefs: json, updatedAt: now } })
    .run();
  return merged;
}
