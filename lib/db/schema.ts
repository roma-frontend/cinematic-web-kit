// Multi-tenant schema: users own sites; a site is a full BuilderDoc (draft +
// published snapshots), can be reached by slug (/s/<slug>, <slug>.APP_HOST)
// or by any number of attached custom domains. Form submissions are stored
// per-site.

import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull().default(''),
    passwordHash: text('password_hash').notNull(),
    /** Access role: 'customer' (default) | 'admin' | 'superadmin'. */
    role: text('role').notNull().default('customer'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    /** sha256 hex of the bearer token — the raw token never touches the DB. */
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const sites = sqliteTable(
  'sites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** URL identity: /s/<slug> and <slug>.<APP_HOST>. */
    slug: text('slug').notNull(),
    /** BuilderDoc JSON the studio edits. */
    draftDoc: text('draft_doc').notNull(),
    /** BuilderDoc JSON visitors see; null until first publish. */
    publishedDoc: text('published_doc'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('sites_slug_idx').on(t.slug), index('sites_user_idx').on(t.userId)],
);

export const domains = sqliteTable(
  'domains',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    /** Normalized hostname, e.g. "example.com" (no scheme/port/path). */
    hostname: text('hostname').notNull(),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('domains_hostname_idx').on(t.hostname), index('domains_site_idx').on(t.siteId)],
);

export type User = typeof users.$inferSelect;
export type Role = 'customer' | 'admin' | 'superadmin';

export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    /** Nullable: submissions from the legacy /site preview have no tenant. */
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    formId: text('form_id').notNull().default('contact'),
    /** Submitted fields as JSON. */
    data: text('data').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('submissions_site_idx').on(t.siteId)],
);

// Superadmin audit trail: who did what to whom. Actor fields are denormalized
// so the record survives the actor being deleted.
export const audit = sqliteTable(
  'audit',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    actorEmail: text('actor_email').notNull().default(''),
    action: text('action').notNull(),
    target: text('target').notNull().default(''),
    detail: text('detail').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('audit_created_idx').on(t.createdAt)],
);
export type Session = typeof sessions.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Audit = typeof audit.$inferSelect;
