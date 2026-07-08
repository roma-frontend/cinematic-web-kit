import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb, platformSettings } from '@/lib/db';

// Thin key/value accessor over the platform_settings table. Values are opaque
// strings (plain text or JSON). All reads are best-effort: if the table can't
// be reached the getters return null/{} so callers degrade gracefully instead
// of throwing (mirrors the audit/notify "never break the request" philosophy).

/** Read one raw setting value, or null when unset/unreachable. */
export function getSetting(key: string): string | null {
  try {
    const row = getDb().select().from(platformSettings).where(eq(platformSettings.key, key)).get();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Parse a JSON-encoded setting into T, or return the fallback on any error. */
export function getJsonSetting<T>(key: string, fallback: T): T {
  const raw = getSetting(key);
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Upsert one setting (best-effort). Empty string is a valid stored value. */
export function setSetting(key: string, value: string, updatedBy = ''): void {
  try {
    const db = getDb();
    const now = new Date();
    db.insert(platformSettings)
      .values({ key, value, updatedBy, updatedAt: now })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedBy, updatedAt: now },
      })
      .run();
  } catch {
    /* settings are best-effort; a write failure must not break the operation */
  }
}

/** Store an object as a JSON setting. */
export function setJsonSetting(key: string, value: unknown, updatedBy = ''): void {
  setSetting(key, JSON.stringify(value), updatedBy);
}
