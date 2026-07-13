// Multi-tenant schema: users own sites; a site is a full BuilderDoc (draft +
// published snapshots), can be reached by slug (/s/<slug>, <slug>.APP_HOST)
// or by any number of attached custom domains. Form submissions are stored
// per-site.

import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

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
    /** Brute-force lockout: consecutive failed logins; reset on success. */
    failedAttempts: integer('failed_attempts').notNull().default(0),
    /** Login refused until this moment after too many failed attempts. */
    lockedUntil: integer('locked_until', { mode: 'timestamp_ms' }),
    /** Base32 TOTP secret (authenticator app). Null until enrollment begins. */
    totpSecret: text('totp_secret'),
    /** When true, TOTP replaces the emailed login code as the second factor. */
    totpEnabled: integer('totp_enabled', { mode: 'boolean' }).notNull().default(false),
    /** Forces a password change on next dashboard entry (set by superadmin temp-password issue). */
    mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
    /** Telegram user id (string form) when the account was linked via Telegram login. */
    telegramId: text('telegram_id'),
    /** Telegram @username (without '@'); kept fresh on each Telegram login. */
    telegramUsername: text('telegram_username'),
    /** Google account id (the OpenID `sub`) when the account was linked via Google login. */
    googleId: text('google_id'),
    /** Apple account id (the OIDC `sub`) when the account was linked via Apple login. */
    appleId: text('apple_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    uniqueIndex('users_telegram_id_idx').on(t.telegramId),
    uniqueIndex('users_google_id_idx').on(t.googleId),
    uniqueIndex('users_apple_id_idx').on(t.appleId),
  ],
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
    /** Org-wide admin-panel theme id (dashboard of the owner + members' account
     *  area). Empty = inherit the platform theme. */
    dashboardTheme: text('dashboard_theme').notNull().default(''),
    /** JSON array of member-plan ids the admin explicitly deleted, so builder
     *  pricing-card sync/seed never resurrects them. */
    suppressedPlans: text('suppressed_plans').notNull().default('[]'),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('sites_slug_idx').on(t.slug), index('sites_user_idx').on(t.userId)],
);

export const siteVersions = sqliteTable(
  'site_versions',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default(''),
    doc: text('doc').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_versions_site_created_idx').on(t.siteId, t.createdAt)],
);
export type SiteVersion = typeof siteVersions.$inferSelect;

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
    /** Platform-side provisioning state (DNS/cert/provider), hidden from tenant admins. */
    provisioningProvider: text('provisioning_provider').notNull().default(''),
    provisioningStatus: text('provisioning_status').notNull().default('pending'),
    provisioningError: text('provisioning_error').notNull().default(''),
    lastCheckedAt: integer('last_checked_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('domains_hostname_idx').on(t.hostname), index('domains_site_idx').on(t.siteId)],
);

export type User = typeof users.$inferSelect;
export type Role = 'customer' | 'admin' | 'superadmin';

// One-time email codes for the platform auth: 6-digit login OTP (second factor
// delivered by email) and long password-reset tokens. Only the sha256 of the
// code/token is stored — a leaked DB cannot be replayed. Rows are one-shot
// (consumed_at) and short-lived (expires_at); attempts guards 6-digit codes
// from online brute-force.
export const authCodes = sqliteTable(
  'auth_codes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Denormalized delivery address (users.email at issue time). */
    email: text('email').notNull(),
    /** 'login_otp' | 'password_reset'. */
    purpose: text('purpose').notNull(),
    /** sha256 hex of the 6-digit code / reset token — never the raw value. */
    codeHash: text('code_hash').notNull(),
    /** Wrong guesses so far; the row dies at MAX_OTP_ATTEMPTS. */
    attempts: integer('attempts').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('auth_codes_user_idx').on(t.userId), index('auth_codes_expires_idx').on(t.expiresAt)],
);
export type AuthCode = typeof authCodes.$inferSelect;

// Per-user UI preferences (platform users: customer/admin/superadmin alike).
// One JSON object per user — theme, locale, dashboard view state, builder
// editor chrome — so every preference follows the account across browsers
// instead of living in localStorage. Kept as a single blob: the shape is
// open-ended client state, not something to query or join on.
export const userPrefs = sqliteTable('user_prefs', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** JSON object of preference key → value (see lib/user-prefs.ts). */
  prefs: text('prefs').notNull().default('{}'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
export type UserPrefsRow = typeof userPrefs.$inferSelect;

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
    /** Preferred site color scheme: 'dark' | 'light' ('' = follow the toggle/browser). */
    theme: text('theme').notNull().default(''),
    /** Brute-force lockout: consecutive failed logins; reset on success. */
    failedAttempts: integer('failed_attempts').notNull().default(0),
    /** Login refused until this moment after too many failed attempts. */
    lockedUntil: integer('locked_until', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    /** Google account id (OpenID `sub`) when this member linked Google login. */
    googleId: text('google_id'),
    /** Apple account id (OIDC `sub`) when this member linked Apple login. */
    appleId: text('apple_id'),
    /** Telegram numeric account id when this member linked Telegram login. */
    telegramId: text('telegram_id'),
    /** Telegram @username (without '@') captured at sign-in, refreshed each login. */
    telegramUsername: text('telegram_username'),
  },
  (t) => [
    uniqueIndex('site_users_site_email_idx').on(t.siteId, t.email),
    index('site_users_site_idx').on(t.siteId),
    uniqueIndex('site_users_site_google_idx').on(t.siteId, t.googleId),
    uniqueIndex('site_users_site_apple_idx').on(t.siteId, t.appleId),
    uniqueIndex('site_users_site_telegram_idx').on(t.siteId, t.telegramId),
  ],
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

// One-time email codes for the per-tenant END-USER auth (mirror of authCodes,
// scoped to site_users): 6-digit login OTP (second factor emailed on password
// login) and long password-reset tokens. Only the sha256 of the code/token is
// stored — a leaked DB cannot be replayed. Rows are one-shot (consumed_at) and
// short-lived (expires_at); attempts guards 6-digit codes from online brute-force.
// Always scoped by siteId so one tenant's codes can never cross to another.
export const siteAuthCodes = sqliteTable(
  'site_auth_codes',
  {
    id: text('id').primaryKey(),
    siteUserId: text('site_user_id')
      .notNull()
      .references(() => siteUsers.id, { onDelete: 'cascade' }),
    /** Denormalized for fast scoping that a code belongs to the current site. */
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    /** Denormalized delivery address (site_users.email at issue time). */
    email: text('email').notNull(),
    /** 'login_otp' | 'password_reset'. */
    purpose: text('purpose').notNull(),
    /** sha256 hex of the 6-digit code / reset token — never the raw value. */
    codeHash: text('code_hash').notNull(),
    /** Wrong guesses so far; the row dies at MAX_OTP_ATTEMPTS. */
    attempts: integer('attempts').notNull().default(0),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_auth_codes_user_idx').on(t.siteUserId), index('site_auth_codes_expires_idx').on(t.expiresAt)],
);
export type SiteAuthCode = typeof siteAuthCodes.$inferSelect;

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

// ── Structured learning: courses → lessons → per-member progress ─────────────
// A course groups ordered lessons; members mark lessons complete and the cabinet
// shows progress. All rows are siteId-scoped (tenant isolation) like everything
// else under a site. Drafts (published=false) are hidden from members.
export const siteCourses = sqliteTable(
  'site_courses',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    description: text('description').notNull().default(''),
    /** Accent color (hex) for the course card. */
    accent: text('accent').notNull().default(''),
    /** Manual sort order (ascending). */
    position: integer('position').notNull().default(0),
    published: integer('published', { mode: 'boolean' }).notNull().default(true),
    createdBy: text('created_by').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('site_courses_site_idx').on(t.siteId)],
);
export type SiteCourse = typeof siteCourses.$inferSelect;

export const siteLessons = sqliteTable(
  'site_lessons',
  {
    id: text('id').primaryKey(),
    courseId: text('course_id')
      .notNull()
      .references(() => siteCourses.id, { onDelete: 'cascade' }),
    /** Denormalized for fast siteId scoping. */
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    /** Rich text / markdown lesson body. */
    body: text('body').notNull().default(''),
    /** Optional embedded video URL (YouTube/Vimeo/mp4/R2). */
    videoUrl: text('video_url').notNull().default(''),
    /** Optional attachment/download URL (e.g. an R2 document). */
    attachmentUrl: text('attachment_url').notNull().default(''),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('site_lessons_course_idx').on(t.courseId), index('site_lessons_site_idx').on(t.siteId)],
);
export type SiteLesson = typeof siteLessons.$inferSelect;

// One row per (member, lesson) that has been completed. Absence = not done.
export const siteLessonProgress = sqliteTable(
  'site_lesson_progress',
  {
    id: text('id').primaryKey(),
    siteUserId: text('site_user_id')
      .notNull()
      .references(() => siteUsers.id, { onDelete: 'cascade' }),
    lessonId: text('lesson_id')
      .notNull()
      .references(() => siteLessons.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    uniqueIndex('site_lesson_progress_uq').on(t.siteUserId, t.lessonId),
    index('site_lesson_progress_user_idx').on(t.siteUserId),
  ],
);
export type SiteLessonProgress = typeof siteLessonProgress.$inferSelect;

// Admin-uploaded documents/files for members (PDF, video, etc.). Stored in R2
// when configured, else under public/uploads; only the URL + metadata live here.
export const siteDocuments = sqliteTable(
  'site_documents',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    /** Original filename (for display + download). */
    fileName: text('file_name').notNull().default(''),
    /** Public URL (R2 or /uploads/…). */
    url: text('url').notNull().default(''),
    /** Storage key (R2 object key or local path) for deletion. */
    storageKey: text('storage_key').notNull().default(''),
    contentType: text('content_type').notNull().default(''),
    size: integer('size').notNull().default(0),
    published: integer('published', { mode: 'boolean' }).notNull().default(true),
    uploadedBy: text('uploaded_by').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_documents_site_idx').on(t.siteId)],
);
export type SiteDocument = typeof siteDocuments.$inferSelect;

// Support tickets: a member opens a thread, member + admin exchange messages.
export const siteTickets = sqliteTable(
  'site_tickets',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    siteUserId: text('site_user_id')
      .notNull()
      .references(() => siteUsers.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull().default(''),
    /** 'open' | 'closed'. */
    status: text('status').notNull().default('open'),
    /** Who wrote last: 'member' | 'admin' (drives the "awaiting reply" hint). */
    lastActor: text('last_actor').notNull().default('member'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_tickets_site_idx').on(t.siteId), index('site_tickets_user_idx').on(t.siteUserId)],
);
export type SiteTicket = typeof siteTickets.$inferSelect;

export const siteTicketMessages = sqliteTable(
  'site_ticket_messages',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => siteTickets.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    /** 'member' | 'admin'. */
    authorType: text('author_type').notNull().default('member'),
    authorId: text('author_id').notNull().default(''),
    body: text('body').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_ticket_messages_ticket_idx').on(t.ticketId)],
);
export type SiteTicketMessage = typeof siteTicketMessages.$inferSelect;

// Announcements: admin broadcasts to members (also fanned out as notifications).
export const siteAnnouncements = sqliteTable(
  'site_announcements',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    /** Pinned announcements sort to the top. */
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    createdBy: text('created_by').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('site_announcements_site_idx').on(t.siteId)],
);
export type SiteAnnouncement = typeof siteAnnouncements.$inferSelect;





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

// Role-based access control (ported from caron's accessControl): the superadmin
// can disable specific dashboard capabilities per non-superadmin role. Absence
// of a row means ENABLED — so the default state preserves current behaviour.
// Keyed by (role, capability); superadmin is never restricted.
export const accessControl = sqliteTable(
  'access_control',
  {
    /** Role the rule applies to (currently 'admin'; extensible). */
    role: text('role').notNull(),
    /** Capability key from lib/access.ts CAPABILITIES. */
    capability: text('capability').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** Platform user id of the superadmin who last changed it. */
    updatedBy: text('updated_by').notNull().default(''),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.role, t.capability] })],
);
export type AccessControl = typeof accessControl.$inferSelect;

// Time-limited capability grants (ported from caron's accessGrants): the
// superadmin can temporarily re-enable a capability that the matrix disabled
// for a role, until `expiresAt`. Live grants are subtracted from the disabled
// set in lib/access.ts, so access reverts automatically when they expire.
export const accessGrants = sqliteTable(
  'access_grants',
  {
    id: text('id').primaryKey(),
    role: text('role').notNull(),
    capability: text('capability').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    grantedBy: text('granted_by').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('access_grants_role_idx').on(t.role)],
);
export type AccessGrant = typeof accessGrants.$inferSelect;

// Staff activity trail (ported from caron's activity.ts): one row per dashboard
// route a staff member visits — a lightweight "session replay" the superadmin
// can review. Bounded by a best-effort TTL prune in lib/activity.ts.
export const activityTrail = sqliteTable(
  'activity_trail',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    at: integer('at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('activity_trail_user_idx').on(t.userId), index('activity_trail_at_idx').on(t.at)],
);
export type ActivityTrail = typeof activityTrail.$inferSelect;

// Soft-delete recycle bin for sites (ported concept from caron's trash). A
// superadmin "delete" snapshots the site here and removes it from `sites`, so
// every existing site query stays correct (deleted sites truly leave `sites`),
// and it can be restored or purged from the Trash screen. Related rows
// (domains/submissions/members) are not snapshotted — restore recovers the
// site content itself.
export const trashedSites = sqliteTable('trashed_sites', {
  /** Original site id (reused on restore). */
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  draftDoc: text('draft_doc').notNull(),
  publishedDoc: text('published_doc'),
  memberApproval: integer('member_approval', { mode: 'boolean' }).notNull().default(true),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  originalCreatedAt: integer('original_created_at', { mode: 'timestamp_ms' }).notNull(),
  deletedBy: text('deleted_by').notNull().default(''),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }).notNull(),
});
export type TrashedSite = typeof trashedSites.$inferSelect;

// Saved filter presets for admin tables (ported from caron's savedViews). Each
// row is one named filter for a (user, route) pair; `query` is an opaque JSON
// blob the client table interprets (e.g. { search, role, status }).
export const savedViews = sqliteTable(
  'saved_views',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** Table identity, e.g. 'users' | 'allSites'. */
    route: text('route').notNull(),
    name: text('name').notNull(),
    /** JSON-encoded filter state. */
    query: text('query').notNull().default('{}'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('saved_views_user_route_idx').on(t.userId, t.route)],
);
export type SavedView = typeof savedViews.$inferSelect;

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



// ─────────────────────────────────────────────────────────────────────────
// Billing: platform subscriptions + payment history. A platform `user` buys a
// plan (see lib/billing/plans.ts); the active subscription drives feature
// entitlements. Stripe (via REST) is the provider when configured, else a
// "manual" provider the superadmin drives by hand — both write the same rows.
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** PlanId: 'starter' | 'pro' | 'studio'. */
    planId: text('plan_id').notNull(),
    /** BillingInterval: 'month' | 'year'. */
    interval: text('interval').notNull().default('month'),
    /** 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'. */
    status: text('status').notNull().default('incomplete'),
    /** 'stripe' | 'manual'. */
    provider: text('provider').notNull().default('manual'),
    providerCustomerId: text('provider_customer_id').notNull().default(''),
    providerSubId: text('provider_sub_id').notNull().default(''),
    /** Price snapshot (cents) at subscription time. */
    amount: integer('amount').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp_ms' }),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
    /** When true, the subscription ends at currentPeriodEnd (no auto-renew). */
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
    canceledAt: integer('canceled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('subscriptions_user_idx').on(t.userId),
    index('subscriptions_status_idx').on(t.status),
    index('subscriptions_provider_sub_idx').on(t.providerSubId),
  ],
);
export type Subscription = typeof subscriptions.$inferSelect;

// One row per payment attempt / invoice. `paid` rows drive revenue metrics.
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id'),
    planId: text('plan_id').notNull().default(''),
    /** Amount in cents. */
    amount: integer('amount').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    /** 'paid' | 'failed' | 'refunded' | 'pending'. */
    status: text('status').notNull().default('pending'),
    provider: text('provider').notNull().default('manual'),
    providerInvoiceId: text('provider_invoice_id').notNull().default(''),
    providerPaymentId: text('provider_payment_id').notNull().default(''),
    description: text('description').notNull().default(''),
    /** Human invoice number, e.g. "CWK-2026-0001". */
    invoiceNumber: text('invoice_number').notNull().default(''),
    periodStart: integer('period_start', { mode: 'timestamp_ms' }),
    periodEnd: integer('period_end', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('payments_user_idx').on(t.userId),
    index('payments_status_idx').on(t.status),
    index('payments_created_idx').on(t.createdAt),
  ],
);
export type Payment = typeof payments.$inferSelect;

// Webhook idempotency + audit: the provider event id is the primary key, so a
// re-delivered event is a no-op (INSERT OR IGNORE). Keeps a copy of the payload
// for debugging in the superadmin billing screen.
export const billingEvents = sqliteTable(
  'billing_events',
  {
    /** Provider event id (e.g. Stripe "evt_..."). */
    id: text('id').primaryKey(),
    type: text('type').notNull().default(''),
    provider: text('provider').notNull().default('stripe'),
    payload: text('payload').notNull().default(''),
    processedAt: integer('processed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('billing_events_type_idx').on(t.type)],
);
export type BillingEvent = typeof billingEvents.$inferSelect;

// Superadmin-editable plan presentation/config overrides. One row per PlanId;
// absence = code defaults (lib/billing/plans.ts). `features` is a JSON array
// filtered to the canonical enforced FeatureKey set on read, so an override can
// never advertise a capability that isn't actually gated in code.
export const planOverrides = sqliteTable('plan_overrides', {
  /** PlanId: 'starter' | 'pro' | 'studio'. */
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  tagline: text('tagline').notNull().default(''),
  priceMonth: integer('price_month'),
  priceYear: integer('price_year'),
  trialDays: integer('trial_days'),
  /** Site limit; -1 = unlimited, null = use code default. */
  sitesLimit: integer('sites_limit'),
  accent: text('accent').notNull().default(''),
  popular: integer('popular', { mode: 'boolean' }),
  /** JSON array of FeatureKey. */
  features: text('features'),
  updatedBy: text('updated_by').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
export type PlanOverride = typeof planOverrides.$inferSelect;

// Superadmin-editable, platform-wide key/value settings (integrations, toggles).
// One row per key; the value is an opaque string (plain text or JSON). Used for
// the Telegram notifications config so tokens/toggles live in the DB (editable
// in the Control Center) with an env-var fallback — no redeploy to reconfigure.
export const platformSettings = sqliteTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default(''),
  updatedBy: text('updated_by').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
export type PlatformSetting = typeof platformSettings.$inferSelect;

// Per-user monthly AI VIDEO generation counter (MUAPI spends real credits, so
// each plan caps videos/month — see lib/billing/plans.ts videoMonthly). One row
// per (userId, 'YYYY-MM'); images are free (Pollinations) and never counted.
export const mediaUsage = sqliteTable('media_usage', {
  userId: text('user_id').notNull(),
  /** Billing-agnostic calendar month, 'YYYY-MM' (UTC). */
  period: text('period').notNull(),
  videoCount: integer('video_count').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.period] })]);
export type MediaUsage = typeof mediaUsage.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────
// Tenant commerce (per-organization): an org admin builds a CATALOG of member
// plans for THEIR site; new members subscribe through the PLATFORM Stripe
// account. Fully scoped by siteId — one org's plans/subscriptions can never
// touch another's.

/** Legacy Connect table kept for old databases; new flows do not read/write it. */
export const siteStripeAccounts = sqliteTable(
  'site_stripe_accounts',
  {
    siteId: text('site_id')
      .primaryKey()
      .references(() => sites.id, { onDelete: 'cascade' }),
    /** Legacy connected account id (acct_...). */
    stripeAccountId: text('stripe_account_id').notNull(),
    /** Legacy onboarding status. */
    chargesEnabled: integer('charges_enabled', { mode: 'boolean' }).notNull().default(false),
    detailsSubmitted: integer('details_submitted', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [uniqueIndex('site_stripe_acct_idx').on(t.stripeAccountId)],
);
export type SiteStripeAccount = typeof siteStripeAccounts.$inferSelect;

/** A member plan in an org's catalog. Checkout uses inline Stripe price_data. */
export const sitePlans = sqliteTable(
  'site_plans',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default(''),
    description: text('description').notNull().default(''),
    /** Recurring amount in the smallest currency unit (cents). */
    amountCents: integer('amount_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    /** Billing cadence: 'month' | 'year'. */
    interval: text('interval').notNull().default('month'),
    /** JSON array of perk strings shown on the landing card. */
    perks: text('perks').notNull().default('[]'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Legacy product/price ids from the removed Connect flow. */
    stripeProductId: text('stripe_product_id'),
    stripePriceId: text('stripe_price_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('site_plans_site_idx').on(t.siteId)],
);
export type SitePlan = typeof sitePlans.$inferSelect;

/** A member's subscription to one of their org's plans. */
export const memberSubscriptions = sqliteTable(
  'member_subscriptions',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    siteUserId: text('site_user_id')
      .notNull()
      .references(() => siteUsers.id, { onDelete: 'cascade' }),
    planId: text('plan_id').notNull(),
    /** 'pending' | 'active' | 'past_due' | 'canceled' | 'expired'. */
    status: text('status').notNull().default('pending'),
    provider: text('provider').notNull().default('stripe'),
    /** Stripe subscription id on the platform account (sub_...). */
    providerSubId: text('provider_sub_id'),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('member_subs_site_idx').on(t.siteId),
    index('member_subs_user_idx').on(t.siteUserId),
    uniqueIndex('member_subs_provider_idx').on(t.providerSubId),
  ],
);
export type MemberSubscription = typeof memberSubscriptions.$inferSelect;


// ─────────────────────────────────────────────────────────────────────────
// Platform-managed tenant commerce (Variant A): ALL member payments are
// collected on the PLATFORM's single Stripe account (admins never configure
// Stripe). Each collected payment is tagged with its org (siteId) so the
// superadmin can see per-org revenue and settle payouts to admins via a manual
// ledger. Balance(org) = collected − paid_out − platform fee.

/** One collected member payment (a paid Checkout/invoice), tagged by org. */
export const memberPayments = sqliteTable(
  'member_payments',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    siteUserId: text('site_user_id'),
    planId: text('plan_id').notNull().default(''),
    /** Amount collected in the smallest currency unit (cents). */
    amountCents: integer('amount_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    /** Stripe id (checkout session / invoice / payment intent) — idempotency key. */
    providerRef: text('provider_ref').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('member_payments_site_idx').on(t.siteId),
    uniqueIndex('member_payments_provider_idx').on(t.providerRef),
  ],
);
export type MemberPayment = typeof memberPayments.$inferSelect;

/** A superadmin-recorded payout to an org admin (manual settlement ledger). */
export const orgPayouts = sqliteTable(
  'org_payouts',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    note: text('note').notNull().default(''),
    /** Superadmin user id who recorded the payout. */
    createdBy: text('created_by').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('org_payouts_site_idx').on(t.siteId)],
);
export type OrgPayout = typeof orgPayouts.$inferSelect;
