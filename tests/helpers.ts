import { getRawDb } from '@/lib/db';

/**
 * Wipe every row from every table in the shared throwaway test DB. Call in a
 * beforeEach so each DB-backed test starts from a clean, deterministic state
 * (e.g. so the "first account becomes superadmin" bootstrap is reproducible).
 */
export function resetDb(): void {
  const raw = getRawDb();
  const tables = raw
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  raw.pragma('foreign_keys = OFF');
  for (const { name } of tables) raw.prepare(`DELETE FROM "${name}"`).run();
  raw.pragma('foreign_keys = ON');
}
