// SQLite connection singleton. The DB lives in data/app.db next to the other
// kit data files. Migrations are plain idempotent SQL executed on first open,
// so `npm run dev` / `npm start` never need a separate migrate step.

import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_FILE = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'app.db');

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  draft_doc TEXT NOT NULL,
  published_doc TEXT,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS sites_slug_idx ON sites (slug);
CREATE INDEX IF NOT EXISTS sites_user_idx ON sites (user_id);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS domains_hostname_idx ON domains (hostname);
CREATE INDEX IF NOT EXISTS domains_site_idx ON domains (site_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
  form_id TEXT NOT NULL DEFAULT 'contact',
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_site_idx ON submissions (site_id);
`;

type DB = BetterSQLite3Database<typeof schema>;

// Survive Next.js dev-server module reloads without leaking connections.
const globalForDb = globalThis as unknown as { __cwkDb?: DB };

function createDb(): DB {
  mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const sqlite = new Database(DB_FILE);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.exec(MIGRATIONS);
  return drizzle(sqlite, { schema });
}

export function getDb(): DB {
  if (!globalForDb.__cwkDb) globalForDb.__cwkDb = createDb();
  return globalForDb.__cwkDb;
}

/** URL-safe unique id, e.g. "u_hK3n9xPqZw4R". */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString('base64url')}`;
}

export * from './schema';
