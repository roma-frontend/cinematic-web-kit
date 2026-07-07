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
  role TEXT NOT NULL DEFAULT 'customer',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER,
  user_agent TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  draft_doc TEXT NOT NULL,
  published_doc TEXT,
  member_approval INTEGER NOT NULL DEFAULT 1,
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
  site_user_id TEXT REFERENCES site_users(id) ON DELETE SET NULL,
  form_id TEXT NOT NULL DEFAULT 'contact',
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_site_idx ON submissions (site_id);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit (created_at);

CREATE TABLE IF NOT EXISTS site_users (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '',
  email_notify INTEGER NOT NULL DEFAULT 1,
  marketing INTEGER NOT NULL DEFAULT 0,
  locale TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  last_login_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS site_users_site_email_idx ON site_users (site_id, email);
CREATE INDEX IF NOT EXISTS site_users_site_idx ON site_users (site_id);

CREATE TABLE IF NOT EXISTS site_sessions (
  id TEXT PRIMARY KEY,
  site_user_id TEXT NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER,
  user_agent TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS site_sessions_user_idx ON site_sessions (site_user_id);
CREATE INDEX IF NOT EXISTS site_sessions_site_idx ON site_sessions (site_id);

CREATE TABLE IF NOT EXISTS site_materials (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS site_materials_site_idx ON site_materials (site_id);

CREATE TABLE IF NOT EXISTS site_courses (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS site_courses_site_idx ON site_courses (site_id);

CREATE TABLE IF NOT EXISTS site_lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES site_courses(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  attachment_url TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS site_lessons_course_idx ON site_lessons (course_id);
CREATE INDEX IF NOT EXISTS site_lessons_site_idx ON site_lessons (site_id);

CREATE TABLE IF NOT EXISTS site_lesson_progress (
  id TEXT PRIMARY KEY,
  site_user_id TEXT NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES site_lessons(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  completed_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS site_lesson_progress_uq ON site_lesson_progress (site_user_id, lesson_id);
CREATE INDEX IF NOT EXISTS site_lesson_progress_user_idx ON site_lesson_progress (site_user_id);

CREATE TABLE IF NOT EXISTS site_documents (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  storage_key TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_documents_site_idx ON site_documents (site_id);

CREATE TABLE IF NOT EXISTS site_tickets (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  site_user_id TEXT NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  last_actor TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_tickets_site_idx ON site_tickets (site_id);
CREATE INDEX IF NOT EXISTS site_tickets_user_idx ON site_tickets (site_user_id);

CREATE TABLE IF NOT EXISTS site_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES site_tickets(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL DEFAULT 'member',
  author_id TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_ticket_messages_ticket_idx ON site_ticket_messages (ticket_id);




CREATE TABLE IF NOT EXISTS site_notifications (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  site_user_id TEXT NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_notifications_user_idx ON site_notifications (site_user_id);
CREATE INDEX IF NOT EXISTS site_notifications_site_idx ON site_notifications (site_id);

CREATE TABLE IF NOT EXISTS org_requests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'create',
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL DEFAULT '',
  requester_name TEXT NOT NULL DEFAULT '',
  requested_name TEXT NOT NULL DEFAULT '',
  requested_slug TEXT NOT NULL DEFAULT '',
  target_site_id TEXT,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at INTEGER,
  rejection_reason TEXT NOT NULL DEFAULT '',
  result_site_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS org_requests_status_idx ON org_requests (status);
CREATE INDEX IF NOT EXISTS org_requests_requester_idx ON org_requests (requester_id);

CREATE TABLE IF NOT EXISTS auth_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_codes_user_idx ON auth_codes (user_id);
CREATE INDEX IF NOT EXISTS auth_codes_expires_idx ON auth_codes (expires_at);

CREATE TABLE IF NOT EXISTS site_auth_codes (
  id TEXT PRIMARY KEY,
  site_user_id TEXT NOT NULL REFERENCES site_users(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_auth_codes_user_idx ON site_auth_codes (site_user_id);
CREATE INDEX IF NOT EXISTS site_auth_codes_expires_idx ON site_auth_codes (expires_at);

CREATE TABLE IF NOT EXISTS user_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS org_members (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS org_members_site_user_idx ON org_members (site_id, user_id);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON org_members (user_id);

CREATE TABLE IF NOT EXISTS access_control (
  role TEXT NOT NULL,
  capability TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (role, capability)
);

CREATE TABLE IF NOT EXISTS access_grants (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  capability TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  granted_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS access_grants_role_idx ON access_grants (role);

CREATE TABLE IF NOT EXISTS activity_trail (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_trail_user_idx ON activity_trail (user_id);
CREATE INDEX IF NOT EXISTS activity_trail_at_idx ON activity_trail (at);

CREATE TABLE IF NOT EXISTS trashed_sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  draft_doc TEXT NOT NULL,
  published_doc TEXT,
  member_approval INTEGER NOT NULL DEFAULT 1,
  published_at INTEGER,
  original_created_at INTEGER NOT NULL,
  deleted_by TEXT NOT NULL DEFAULT '',
  deleted_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_views_user_route_idx ON saved_views (user_id, route);
`;

type DB = BetterSQLite3Database<typeof schema>;

// Survive Next.js dev-server module reloads without leaking connections.
const globalForDb = globalThis as unknown as { __cwkDb?: DB; __cwkSqlite?: Database.Database };

function createDb(): DB {
  mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const sqlite = new Database(DB_FILE);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.exec(MIGRATIONS);
  // Idempotent column additions for databases created before a column existed.
  const addColumn = (table: string, column: string, ddl: string) => {
    const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  addColumn('users', 'role', `role TEXT NOT NULL DEFAULT 'customer'`);
  addColumn('users', 'is_active', `is_active INTEGER NOT NULL DEFAULT 1`);
  // Brute-force lockout counters (both auth realms).
  addColumn('users', 'failed_attempts', `failed_attempts INTEGER NOT NULL DEFAULT 0`);
  addColumn('users', 'locked_until', `locked_until INTEGER`);
  addColumn('users', 'totp_secret', `totp_secret TEXT`);
  addColumn('users', 'totp_enabled', `totp_enabled INTEGER NOT NULL DEFAULT 0`);
  addColumn('site_users', 'failed_attempts', `failed_attempts INTEGER NOT NULL DEFAULT 0`);
  addColumn('site_users', 'locked_until', `locked_until INTEGER`);
  addColumn('sessions', 'last_active_at', `last_active_at INTEGER`);
  addColumn('sessions', 'user_agent', `user_agent TEXT NOT NULL DEFAULT ''`);
  addColumn('sessions', 'ip', `ip TEXT NOT NULL DEFAULT ''`);
  // Per-tenant end-user account fields (added after the initial site_users release).
  addColumn('site_users', 'phone', `phone TEXT NOT NULL DEFAULT ''`);
  addColumn('site_users', 'avatar_color', `avatar_color TEXT NOT NULL DEFAULT ''`);
  addColumn('site_users', 'email_notify', `email_notify INTEGER NOT NULL DEFAULT 1`);
  addColumn('site_users', 'marketing', `marketing INTEGER NOT NULL DEFAULT 0`);
  addColumn('site_users', 'locale', `locale TEXT NOT NULL DEFAULT ''`);
  addColumn('site_users', 'updated_at', `updated_at INTEGER`);
  addColumn('site_users', 'last_login_at', `last_login_at INTEGER`);
  addColumn('site_sessions', 'last_active_at', `last_active_at INTEGER`);
  addColumn('site_sessions', 'user_agent', `user_agent TEXT NOT NULL DEFAULT ''`);
  addColumn('site_sessions', 'ip', `ip TEXT NOT NULL DEFAULT ''`);
  addColumn('submissions', 'site_user_id', `site_user_id TEXT`);
  // Org-isolation (variant A): membership approval + admin materials.
  addColumn('sites', 'member_approval', `member_approval INTEGER NOT NULL DEFAULT 1`);
  addColumn('site_users', 'status', `status TEXT NOT NULL DEFAULT 'approved'`);
  addColumn('site_users', 'approved_by', `approved_by TEXT`);
  addColumn('site_users', 'approved_at', `approved_at INTEGER`);
  addColumn('site_users', 'rejection_reason', `rejection_reason TEXT NOT NULL DEFAULT ''`);
  // Site end-user color-scheme preference (follows the account, not the browser).
  addColumn('site_users', 'theme', `theme TEXT NOT NULL DEFAULT ''`);
  globalForDb.__cwkSqlite = sqlite;
  return drizzle(sqlite, { schema });
}

export function getDb(): DB {
  if (!globalForDb.__cwkDb) globalForDb.__cwkDb = createDb();
  return globalForDb.__cwkDb;
}

/** Underlying better-sqlite3 handle (for the superadmin DB browser). */
export function getRawDb(): Database.Database {
  if (!globalForDb.__cwkSqlite) getDb();
  return globalForDb.__cwkSqlite!;
}

/** URL-safe unique id, e.g. "u_hK3n9xPqZw4R". */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString('base64url')}`;
}

export * from './schema';
