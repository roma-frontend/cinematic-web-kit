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
    /** Suspend switch: a blocked user cannot log in and all their sessions stop validating. */
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
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
    /** Presence heartbeat: bumped (throttled) on every validated request. */
    lastActiveAt: integer('last_active_at', { mode: 'timestamp_ms' }),
    /** Device fingerprint source captured at login. */
    userAgent: text('user_agent').notNull().default(''),
    ip: text('ip').notNull().default(''),
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
    /** Membership policy: when true, new end-user registrations start 'pending'
     *  and require admin approval before they can access member-only content. */
    memberApproval: integer('member_approval', { mode: 'boolean' }).notNull().default(true),
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

// ─────────────────────────────────────────────────────────────────────────
// Per-tenant END-USER auth. Completely separate from platform `users`: these
// are the customers who register on a tenant's PUBLISHED site to receive that
// tenant's services. Scoped by siteId (email is unique per-site, so the same
// email can exist on different tenant sites), with their own sessions/cookie.
export const siteUsers = sqliteTable(
  'site_users',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull().default(''),
    passwordHash: text('password_hash').notNull(),
    /** Membership state (org-isolation): a member only gains access once an
     *  admin (site owner) approves. 'pending' | 'approved' | 'rejected' | 'suspended'. */
    status: text('status').notNull().default('approved'),
    /** Platform user id (site owner/admin) who reviewed the membership. */
    approvedBy: text('approved_by'),
    approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
    rejectionReason: text('rejection_reason').notNull().default(''),
    /** Optional contact phone the customer can add in their account. */
    phone: text('phone').notNull().default(''),
    /** Avatar accent color (hex/oklch string); initials are derived from the name. */
    avatarColor: text('avatar_color').notNull().default(''),
    /** Transactional email opt-in (default on). */
    emailNotify: integer('email_notify', { mode: 'boolean' }).notNull().default(true),
    /** Marketing/newsletter opt-in (default off). */
    marketing: integer('marketing', { mode: 'boolean' }).notNull().default(false),
    /** Preferred UI language, e.g. 'ru' | 'en' ('' = site default). */
    locale: text('locale').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
  },
  (t) => [uniqueIndex('site_users_site_email_idx').on(t.siteId, t.email), index('site_users_site_idx').on(t.siteId)],
);

export const siteSessions = sqliteTable(
  'site_sessions',
  {
    /** sha256 hex of the bearer token. */
    id: text('id').primaryKey(),
    siteUserId: text('site_user_id')
      .notNull()
      .references(() => siteUsers.id, { onDelete: 'cascade' }),
    /** Denormalized for fast validation that a session belongs to the current site. */
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    /** Presence heartbeat: bumped (throttled) on every validated request. */
    lastActiveAt: integer('last_active_at', { mode: 'timestamp_ms' }),
    /** Device fingerprint source captured at login (for the sessions list). */
    userAgent: text('user_agent').notNull().default(''),
    ip: text('ip').notNull().default(''),
  },
  (t) => [index('site_sessions_user_idx').on(t.siteUserId), index('site_sessions_site_idx').on(t.siteId)],
);
export type SiteUser = typeof siteUsers.$inferSelect;
export type SiteSession = typeof siteSessions.$inferSelect;

// Admin-managed content that only APPROVED members of a site (organization) can
// see. Fully scoped by siteId — one site's members can never read another's.
export const siteMaterials = sqliteTable(
  'site_materials',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    /** Rich text / markdown body. */
    body: text('body').notNull().default(''),
    /** Optional external link (e.g. a file/download URL). */
    url: text('url').notNull().default(''),
    /** Draft materials are hidden from members until published. */
    published: integer('published', { mode: 'boolean' }).notNull().default(true),
    /** Platform user id (site owner) who created it. */
    createdBy: text('created_by').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('site_materials_site_idx').on(t.siteId)],
);
export type SiteMaterial = typeof siteMaterials.$inferSelect;

// Per-member notifications (join approved/rejected/suspended, new material, …).
// Scoped by siteId + siteUserId — a member only ever sees their own.
export const siteNotifications = sqliteTable(
  'site_notifications',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    siteUserId: text('site_user_id')
      .notNull()
      .references(() => siteUsers.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('info'),
    title: text('title').notNull().default(''),
    message: text('message').notNull().default(''),
    read: integer('read', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_notifications_user_idx').on(t.siteUserId), index('site_notifications_site_idx').on(t.siteId)],
);
export type SiteNotification = typeof siteNotifications.$inferSelect;

// Platform-level organization requests (ported from hr-project organizationRequests):
// a platform user asks to CREATE a new organization (tenant site) or JOIN an
// existing one; a SUPERADMIN approves or rejects. On approval of 'create' a site
// is created and owned by the requester (promoted to admin); on 'join' the
// requester is assigned as the org's admin.
export const orgRequests = sqliteTable(
  'org_requests',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull().default('create'), // 'create' | 'join'
    requesterId: text('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requesterEmail: text('requester_email').notNull().default(''),
    requesterName: text('requester_name').notNull().default(''),
    requestedName: text('requested_name').notNull().default(''),
    requestedSlug: text('requested_slug').notNull().default(''),
    targetSiteId: text('target_site_id'),
    message: text('message').notNull().default(''),
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    rejectionReason: text('rejection_reason').notNull().default(''),
    resultSiteId: text('result_site_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('org_requests_status_idx').on(t.status), index('org_requests_requester_idx').on(t.requesterId)],
);
export type OrgRequest = typeof orgRequests.$inferSelect;

// Platform users who belong to an organization (site) as co-admins/editors
// WITHOUT owning it. A join-request approval adds a member here; site access is
// granted to the owner OR any member (see lib/sites.userCanAccessSite).
export const orgMembers = sqliteTable(
  'org_members',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('editor'), // 'editor' | 'admin'
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('org_members_site_user_idx').on(t.siteId, t.userId), index('org_members_user_idx').on(t.userId)],
);
export type OrgMember = typeof orgMembers.$inferSelect;

export const submissions = sqliteTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    /** Nullable: submissions from the legacy /site preview have no tenant. */
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    /** Set when a logged-in site end-user submitted the form (for their account history). */
    siteUserId: text('site_user_id').references(() => siteUsers.id, { onDelete: 'set null' }),
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
