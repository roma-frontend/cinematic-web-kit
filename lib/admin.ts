// Admin/superadmin data layer: cross-tenant queries used by the dashboard's
// staff sections. Authorization is enforced by the API routes / pages that call
// these — the functions themselves are pure reads/writes.

import 'server-only';
import path from 'node:path';
import { statSync } from 'node:fs';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { getDb, newId, users, sites, submissions, sessions, domains, audit, siteUsers, siteSessions, siteMaterials, type User, type Role } from '@/lib/db';

/** A user counts as online when a session heartbeat fired within this window. */
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

/** Human label for a session's user-agent, e.g. "Chrome · Windows". */
export function deviceLabel(ua: string): string {
  if (!ua) return 'Неизвестное устройство';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Браузер';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  siteCount: number;
  activeSessions: number;
  lastSeen: string | null;
  online: boolean;
}

/** Per-user presence snapshot: newest heartbeat + active session count. */
function presenceByUser(): Map<string, { lastSeen: number; activeSessions: number }> {
  const now = Date.now();
  const rows = getDb()
    .select({
      userId: sessions.userId,
      n: sql<number>`count(*)`,
      seen: sql<number>`max(coalesce(${sessions.lastActiveAt}, ${sessions.createdAt}))`,
    })
    .from(sessions)
    .where(sql`${sessions.expiresAt} > ${now}`)
    .groupBy(sessions.userId)
    .all();
  return new Map(rows.map((r) => [r.userId, { lastSeen: Number(r.seen), activeSessions: Number(r.n) }]));
}

export function listUsers(): AdminUserRow[] {
  const db = getDb();
  const now = Date.now();
  const rows = db.select().from(users).orderBy(desc(users.createdAt)).all();
  const counts = db
    .select({ userId: sites.userId, n: sql<number>`count(*)` })
    .from(sites)
    .groupBy(sites.userId)
    .all();
  const byUser = new Map(counts.map((c) => [c.userId, Number(c.n)]));
  const presence = presenceByUser();
  return rows.map((u) => {
    const p = presence.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as Role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      siteCount: byUser.get(u.id) ?? 0,
      activeSessions: p?.activeSessions ?? 0,
      lastSeen: p ? new Date(p.lastSeen).toISOString() : null,
      online: p ? now - p.lastSeen < ONLINE_WINDOW_MS : false,
    };
  });
}

/** Suspend (false) or reinstate (true) a platform user. */
export function setUserActive(id: string, active: boolean): void {
  getDb().update(users).set({ isActive: active }).where(eq(users.id, id)).run();
}

export function getUserById(id: string): User | null {
  return getDb().select().from(users).where(eq(users.id, id)).get() ?? null;
}

export function setUserRole(id: string, role: Role): void {
  getDb().update(users).set({ role }).where(eq(users.id, id)).run();
}

export function countUsers(): number {
  const r = getDb().select({ n: sql<number>`count(*)` }).from(users).get();
  return Number(r?.n ?? 0);
}

export interface AdminSiteRow {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  ownerName: string;
  ownerEmail: string;
  updatedAt: string;
}

export function listAllSites(): AdminSiteRow[] {
  const db = getDb();
  const rows = db
    .select({ site: sites, owner: users })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .orderBy(desc(sites.updatedAt))
    .all();
  return rows.map(({ site, owner }) => ({
    id: site.id,
    name: site.name,
    slug: site.slug,
    published: Boolean(site.publishedDoc),
    ownerName: owner.name,
    ownerEmail: owner.email,
    updatedAt: site.updatedAt.toISOString(),
  }));
}

export interface PlatformStats {
  users: number;
  sites: number;
  published: number;
  submissions: number;
}

export function platformStats(): PlatformStats {
  const db = getDb();
  const u = db.select({ n: sql<number>`count(*)` }).from(users).get();
  const s = db.select({ n: sql<number>`count(*)` }).from(sites).get();
  const p = db
    .select({ n: sql<number>`count(*)` })
    .from(sites)
    .where(sql`${sites.publishedDoc} is not null`)
    .get();
  const f = db.select({ n: sql<number>`count(*)` }).from(submissions).get();
  return {
    users: Number(u?.n ?? 0),
    sites: Number(s?.n ?? 0),
    published: Number(p?.n ?? 0),
    submissions: Number(f?.n ?? 0),
  };
}

// ─────────────────────────── Organizations (superadmin) ───────────────────────────
// An organization == a tenant site; its admin == the platform user who owns it.

export interface OrgOverview {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  memberApproval: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string; role: Role } | null;
  members: { total: number; pending: number; approved: number };
  materials: number;
  submissions: number;
  domains: number;
}

export function getOrgOverview(siteId: string): OrgOverview | null {
  const db = getDb();
  const site = db.select().from(sites).where(eq(sites.id, siteId)).get();
  if (!site) return null;
  const owner = db.select().from(users).where(eq(users.id, site.userId)).get() ?? null;
  const members = db.select({ status: siteUsers.status }).from(siteUsers).where(eq(siteUsers.siteId, siteId)).all();
  const count = (arr: { n: number }[]) => Number(arr[0]?.n ?? 0);
  const mat = db.select({ n: sql<number>`count(*)` }).from(siteMaterials).where(eq(siteMaterials.siteId, siteId)).all();
  const sub = db.select({ n: sql<number>`count(*)` }).from(submissions).where(eq(submissions.siteId, siteId)).all();
  const dom = db.select({ n: sql<number>`count(*)` }).from(domains).where(eq(domains.siteId, siteId)).all();
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    published: Boolean(site.publishedDoc),
    publishedAt: site.publishedAt?.toISOString() ?? null,
    memberApproval: site.memberApproval,
    createdAt: site.createdAt.toISOString(),
    owner: owner ? { id: owner.id, name: owner.name, email: owner.email, role: owner.role as Role } : null,
    members: {
      total: members.length,
      pending: members.filter((m) => m.status === 'pending').length,
      approved: members.filter((m) => m.status === 'approved').length,
    },
    materials: count(mat),
    submissions: count(sub),
    domains: count(dom),
  };
}

/** Transfer a site (organization) to a platform user by email and make them admin.
 *  Accepts EITHER an existing platform user OR a tenant user (site_user): the
 *  latter is promoted into a platform admin (created in `users` from their
 *  credentials) and removed from the tenant base, so a person is never in both.
 *  Superadmin-only (enforced in the route). Returns the new owner. */
export function assignSiteAdmin(siteId: string, email: string): { id: string; email: string; name: string } {
  const db = getDb();
  const norm = email.trim().toLowerCase();
  const site = db.select().from(sites).where(eq(sites.id, siteId)).get();
  if (!site) throw new Error('SITE_NOT_FOUND');

  let target = db.select().from(users).where(eq(users.email, norm)).get() ?? null;

  if (!target) {
    // Promote a tenant user (site_user) into a platform admin.
    const su = db.select().from(siteUsers).where(eq(siteUsers.email, norm)).get();
    if (!su) throw new Error('USER_NOT_FOUND');
    const now = new Date();
    const created: User = {
      id: newId('u'), email: norm, name: su.name, passwordHash: su.passwordHash,
      role: 'admin', isActive: true, createdAt: now,
    };
    db.insert(users).values(created).run();
    // Single identity: drop ALL tenant memberships for this email (sessions cascade).
    db.delete(siteUsers).where(eq(siteUsers.email, norm)).run();
    target = created;
  }

  db.update(sites).set({ userId: target.id, updatedAt: new Date() }).where(eq(sites.id, siteId)).run();
  if (target.role === 'customer') db.update(users).set({ role: 'admin' }).where(eq(users.id, target.id)).run();
  return { id: target.id, email: target.email, name: target.name };
}

export interface AssignableUser { name: string; email: string; source: 'platform' | 'tenant' }

/** Everyone who could be made an org admin — platform users AND tenant users
 *  (site_users), deduped by email (platform wins). */
export function listAssignableUsers(): AssignableUser[] {
  const db = getDb();
  const map = new Map<string, AssignableUser>();
  for (const u of db.select({ name: users.name, email: users.email }).from(users).all()) {
    map.set(u.email, { name: u.name, email: u.email, source: 'platform' });
  }
  for (const u of db.select({ name: siteUsers.name, email: siteUsers.email }).from(siteUsers).all()) {
    if (!map.has(u.email)) map.set(u.email, { name: u.name, email: u.email, source: 'tenant' });
  }
  return [...map.values()];
}

// ── Tenant users (site_users) — superadmin global view + org assignment ──────

export interface TenantUserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  siteId: string;
  siteName: string;
  siteSlug: string;
  createdAt: string;
}

export function listAllSiteUsers(limit = 1000): TenantUserRow[] {
  const rows = getDb()
    .select({ u: siteUsers, siteName: sites.name, siteSlug: sites.slug })
    .from(siteUsers)
    .innerJoin(sites, eq(siteUsers.siteId, sites.id))
    .orderBy(desc(siteUsers.createdAt))
    .limit(limit)
    .all();
  return rows.map(({ u, siteName, siteSlug }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    siteId: u.siteId,
    siteName,
    siteSlug,
    createdAt: u.createdAt.toISOString(),
  }));
}

/** Move a tenant user to another organization (site) and approve them. Throws
 *  'EMAIL_TAKEN' if the target org already has that email. Clears their sessions
 *  (sessions are org-scoped) so the move takes effect cleanly. */
export function assignSiteUserOrg(siteUserId: string, targetSiteId: string): void {
  const db = getDb();
  const user = db.select().from(siteUsers).where(eq(siteUsers.id, siteUserId)).get();
  if (!user) throw new Error('USER_NOT_FOUND');
  const target = db.select({ id: sites.id }).from(sites).where(eq(sites.id, targetSiteId)).get();
  if (!target) throw new Error('ORG_NOT_FOUND');
  if (user.siteId !== targetSiteId) {
    const clash = db
      .select({ id: siteUsers.id })
      .from(siteUsers)
      .where(and(eq(siteUsers.siteId, targetSiteId), eq(siteUsers.email, user.email)))
      .get();
    if (clash) throw new Error('EMAIL_TAKEN');
  }
  db.update(siteUsers)
    .set({ siteId: targetSiteId, status: 'approved', approvedAt: new Date(), rejectionReason: '', updatedAt: new Date() })
    .where(eq(siteUsers.id, siteUserId))
    .run();
  db.delete(siteSessions).where(eq(siteSessions.siteUserId, siteUserId)).run();
}

/** Just set a tenant user's membership status (approve/suspend/etc.). */
export function setSiteUserStatus(siteUserId: string, status: 'pending' | 'approved' | 'rejected' | 'suspended'): void {
  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === 'approved') { set.approvedAt = new Date(); set.rejectionReason = ''; }
  getDb().update(siteUsers).set(set).where(eq(siteUsers.id, siteUserId)).run();
}

// ─────────────────────────── Control Center ───────────────────────────

export interface SessionRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string | null;
  device: string;
  ip: string;
  active: boolean;
  online: boolean;
}

function toSessionRow(session: typeof sessions.$inferSelect, user: User, now: number): SessionRow {
  const seen = (session.lastActiveAt ?? session.createdAt).getTime();
  return {
    id: session.id,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role as Role,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    lastActiveAt: session.lastActiveAt?.toISOString() ?? null,
    device: deviceLabel(session.userAgent),
    ip: session.ip,
    active: session.expiresAt.getTime() > now,
    online: session.expiresAt.getTime() > now && now - seen < ONLINE_WINDOW_MS,
  };
}

/** All sessions across the platform, newest first, with owner + validity. */
export function listSessions(limit = 200): SessionRow[] {
  const now = Date.now();
  const rows = getDb()
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .orderBy(desc(sessions.createdAt))
    .limit(limit)
    .all();
  return rows.map(({ session, user }) => toSessionRow(session, user, now));
}

export function countActiveSessions(): number {
  const r = getDb()
    .select({ n: sql<number>`count(*)` })
    .from(sessions)
    .where(sql`${sessions.expiresAt} > ${Date.now()}`)
    .get();
  return Number(r?.n ?? 0);
}

export function revokeSession(id: string): void {
  getDb().delete(sessions).where(eq(sessions.id, id)).run();
}

export function revokeUserSessions(userId: string): number {
  const res = getDb().delete(sessions).where(eq(sessions.userId, userId)).run();
  return res.changes;
}

/** Delete a user and (via FK cascade) their sessions, sites and submissions. */
export function deleteUser(id: string): void {
  getDb().delete(users).where(eq(users.id, id)).run();
}

export function deleteSiteById(id: string): void {
  getDb().delete(sites).where(eq(sites.id, id)).run();
}

export function unpublishSiteById(id: string): void {
  getDb()
    .update(sites)
    .set({ publishedDoc: null, publishedAt: null, updatedAt: new Date() })
    .where(eq(sites.id, id))
    .run();
}

export function countSuperadmins(): number {
  const r = getDb()
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.role, 'superadmin'))
    .get();
  return Number(r?.n ?? 0);
}

export interface SystemInfo {
  dbSizeKb: number;
  activeSessions: number;
  appHost: string;
  node: string;
  integrations: { muapi: boolean; llm: boolean; analytics: boolean; serverIp: boolean };
}

export function systemInfo(): SystemInfo {
  const dbFile = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'app.db');
  let dbSizeKb = 0;
  try { dbSizeKb = Math.round(statSync(dbFile).size / 1024); } catch { /* file may not exist yet */ }
  return {
    dbSizeKb,
    activeSessions: countActiveSessions(),
    appHost: (process.env.NEXT_PUBLIC_APP_HOST || 'localhost:3000').toLowerCase(),
    node: process.version,
    integrations: {
      muapi: Boolean(process.env.MUAPI_KEY),
      llm: Boolean(process.env.THEME_LLM_KEY),
      analytics: Boolean(process.env.NEXT_PUBLIC_CF_BEACON_TOKEN),
      serverIp: Boolean(process.env.SERVER_IP),
    },
  };
}

export type ActivityKind = 'user' | 'site' | 'publish' | 'submission';
export interface ActivityEvent {
  kind: ActivityKind;
  at: string;
  title: string;
  subtitle: string;
}

/** Merged, newest-first feed of recent platform events. */
export function recentActivity(limit = 20): ActivityEvent[] {
  const db = getDb();
  const events: ActivityEvent[] = [];

  for (const u of db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).all()) {
    events.push({ kind: 'user', at: u.createdAt.toISOString(), title: 'Новый пользователь', subtitle: `${u.name || 'Без имени'} · ${u.email}` });
  }
  for (const s of db.select().from(sites).orderBy(desc(sites.createdAt)).limit(limit).all()) {
    events.push({ kind: 'site', at: s.createdAt.toISOString(), title: 'Создан сайт', subtitle: `${s.name} · /s/${s.slug}` });
    if (s.publishedAt) {
      events.push({ kind: 'publish', at: s.publishedAt.toISOString(), title: 'Публикация сайта', subtitle: `${s.name} · /s/${s.slug}` });
    }
  }
  const subs = db
    .select({ sub: submissions, site: sites })
    .from(submissions)
    .leftJoin(sites, eq(submissions.siteId, sites.id))
    .orderBy(desc(submissions.createdAt))
    .limit(limit)
    .all();
  for (const { sub, site } of subs) {
    events.push({ kind: 'submission', at: sub.createdAt.toISOString(), title: 'Новая заявка', subtitle: site ? `${site.name} · форма «${sub.formId}»` : `форма «${sub.formId}»` });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// ─────────────────────────── Live pulse ───────────────────────────

export interface PulseMetric {
  lastHour: number;
  last24h: number;
  prev24h: number;
}

export interface LivePulse {
  registrations: PulseMetric;
  newSites: PulseMetric;
  publishes: PulseMetric;
  submissions: PulseMetric;
  logins: PulseMetric;
  /** Sites with the most form submissions in the last 24h. */
  hotSites: { id: string; name: string; slug: string; count: number }[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function windowed(times: number[], now: number): PulseMetric {
  const m: PulseMetric = { lastHour: 0, last24h: 0, prev24h: 0 };
  for (const t of times) {
    if (t >= now - HOUR) m.lastHour++;
    if (t >= now - DAY) m.last24h++;
    else if (t >= now - 2 * DAY) m.prev24h++;
  }
  return m;
}

/** Platform activity for the last hour / 24h vs the previous 24h. */
export function livePulse(): LivePulse {
  const db = getDb();
  const now = Date.now();
  const since = new Date(now - 2 * DAY);

  const regs = db.select({ at: users.createdAt }).from(users).where(gte(users.createdAt, since)).all();
  const created = db.select({ at: sites.createdAt }).from(sites).where(gte(sites.createdAt, since)).all();
  const pubs = db.select({ at: sites.publishedAt }).from(sites).where(gte(sites.publishedAt, since)).all();
  const subs = db.select({ at: submissions.createdAt, siteId: submissions.siteId }).from(submissions).where(gte(submissions.createdAt, since)).all();
  const logins = db.select({ at: sessions.createdAt }).from(sessions).where(gte(sessions.createdAt, since)).all();

  const hot = new Map<string, number>();
  for (const s of subs) {
    if (s.siteId && s.at.getTime() >= now - DAY) hot.set(s.siteId, (hot.get(s.siteId) ?? 0) + 1);
  }
  const hotSites: LivePulse['hotSites'] = [];
  for (const [siteId, count] of [...hot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    const site = db.select({ name: sites.name, slug: sites.slug }).from(sites).where(eq(sites.id, siteId)).get();
    if (site) hotSites.push({ id: siteId, name: site.name, slug: site.slug, count });
  }

  return {
    registrations: windowed(regs.map((r) => r.at.getTime()), now),
    newSites: windowed(created.map((r) => r.at.getTime()), now),
    publishes: windowed(pubs.map((r) => r.at!.getTime()), now),
    submissions: windowed(subs.map((r) => r.at.getTime()), now),
    logins: windowed(logins.map((r) => r.at.getTime()), now),
    hotSites,
  };
}

// ─────────────────────────── Security alerts ───────────────────────────

export type AlertLevel = 'info' | 'warn' | 'critical';

export interface SecurityAlert {
  id: string;
  level: AlertLevel;
  /** burst | off_hours | export | role_change | impersonation | destructive | many_sessions */
  kind: string;
  at: string;
  actor: string;
  detail: string;
}

/** Audit actions considered destructive for burst detection. */
const DESTRUCTIVE = new Set(['user.delete', 'site.delete', 'sessions.revoke_user']);
/** Actions that are suspicious when performed at night (00:00–06:00 server time). */
const SENSITIVE = new Set(['role.change', 'user.delete', 'db.export', 'data.export', 'impersonate', 'sessions.revoke_user']);

/**
 * Anomaly feed derived from the recent audit trail + sessions (last 48h).
 * Pure read — nothing is stored; mirrors the caron superadmin alert model.
 */
export function securityAlerts(): { alerts: SecurityAlert[]; counts: Record<AlertLevel, number> } {
  const db = getDb();
  const now = Date.now();
  const since = new Date(now - 2 * DAY);
  const entries = db.select().from(audit).where(gte(audit.createdAt, since)).orderBy(desc(audit.createdAt)).limit(3000).all();

  const alerts: SecurityAlert[] = [];

  // 1) Burst of destructive actions: ≥3 by one actor within 10 minutes.
  const byActor = new Map<string, { email: string; times: number[] }>();
  for (const e of entries) {
    if (!DESTRUCTIVE.has(e.action)) continue;
    const cur = byActor.get(e.actorId) ?? { email: e.actorEmail, times: [] };
    cur.times.push(e.createdAt.getTime());
    byActor.set(e.actorId, cur);
  }
  for (const [actorId, { email, times }] of byActor) {
    times.sort((a, b) => a - b);
    for (let i = 0; i < times.length; i++) {
      const count = times.filter((t) => t >= times[i] && t <= times[i] + 10 * 60 * 1000).length;
      if (count >= 3) {
        alerts.push({
          id: `burst-${actorId}-${times[i]}`,
          level: 'critical',
          kind: 'burst',
          at: new Date(times[i]).toISOString(),
          actor: email,
          detail: `${count} разрушительных действий за 10 минут`,
        });
        break;
      }
    }
  }

  // 2) Off-hours sensitive activity (00:00–06:00 server-local).
  for (const e of entries) {
    if (!SENSITIVE.has(e.action)) continue;
    const hour = e.createdAt.getHours();
    if (hour < 6) {
      alerts.push({
        id: `night-${e.id}`,
        level: 'warn',
        kind: 'off_hours',
        at: e.createdAt.toISOString(),
        actor: e.actorEmail,
        detail: `«${e.action}» в ${String(hour).padStart(2, '0')}:${String(e.createdAt.getMinutes()).padStart(2, '0')}`,
      });
    }
  }

  // 3) Notable single events.
  for (const e of entries) {
    const base = { at: e.createdAt.toISOString(), actor: e.actorEmail, detail: [e.target, e.detail].filter(Boolean).join(' · ') };
    if (e.action === 'db.export' || e.action === 'data.export') {
      alerts.push({ id: `exp-${e.id}`, level: 'info', kind: 'export', ...base });
    } else if (e.action === 'role.change') {
      alerts.push({ id: `role-${e.id}`, level: 'warn', kind: 'role_change', ...base });
    } else if (e.action === 'impersonate') {
      alerts.push({ id: `imp-${e.id}`, level: 'warn', kind: 'impersonation', ...base });
    } else if (e.action === 'user.delete' || e.action === 'site.delete') {
      alerts.push({ id: `del-${e.id}`, level: 'warn', kind: 'destructive', ...base });
    }
  }

  // 4) Users with suspiciously many active sessions.
  const active = db
    .select({ userId: sessions.userId, n: sql<number>`count(*)` })
    .from(sessions)
    .where(sql`${sessions.expiresAt} > ${now}`)
    .groupBy(sessions.userId)
    .all();
  for (const row of active) {
    if (Number(row.n) <= 5) continue;
    const u = db.select({ email: users.email }).from(users).where(eq(users.id, row.userId)).get();
    alerts.push({
      id: `sess-${row.userId}`,
      level: 'warn',
      kind: 'many_sessions',
      at: new Date(now).toISOString(),
      actor: u?.email ?? row.userId,
      detail: `${row.n} активных сессий одновременно`,
    });
  }

  const seen = new Set<string>();
  const deduped = alerts
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);

  return {
    alerts: deduped,
    counts: {
      critical: deduped.filter((a) => a.level === 'critical').length,
      warn: deduped.filter((a) => a.level === 'warn').length,
      info: deduped.filter((a) => a.level === 'info').length,
    },
  };
}

// ─────────────────────────── Data quality ───────────────────────────

export interface DataQuality {
  score: number;
  siteCount: number;
  totalIssues: number;
  counts: Record<string, number>;
}

/** Count blocks across all pages of a BuilderDoc JSON string; -1 if unparsable. */
function docBlockCount(doc: string): number {
  try {
    const parsed = JSON.parse(doc) as { pages?: { blocks?: unknown[] }[] };
    return (parsed.pages ?? []).reduce((s, p) => s + (p.blocks?.length ?? 0), 0);
  } catch {
    return -1;
  }
}

/** Health scan: flags empty/stale/broken content and computes a 0–100 score. */
export function dataQuality(): DataQuality {
  const db = getDb();
  const now = Date.now();

  const allSites = db.select().from(sites).all();
  const counts: Record<string, number> = {
    emptyDrafts: 0, // draft has zero blocks
    brokenDocs: 0, // draft JSON does not parse
    staleDrafts: 0, // never published, older than 7 days
    unverifiedDomains: 0,
    orphanSubmissions: 0, // submission without a site
    expiredSessions: 0, // dead sessions still stored
    usersNoSites: 0,
  };

  for (const s of allSites) {
    const blocks = docBlockCount(s.draftDoc);
    if (blocks === -1) counts.brokenDocs++;
    else if (blocks === 0) counts.emptyDrafts++;
    if (!s.publishedDoc && now - s.createdAt.getTime() > 7 * DAY) counts.staleDrafts++;
  }

  const dom = db.select({ n: sql<number>`count(*)` }).from(domains).where(eq(domains.verified, false)).get();
  counts.unverifiedDomains = Number(dom?.n ?? 0);
  const orphan = db.select({ n: sql<number>`count(*)` }).from(submissions).where(sql`${submissions.siteId} is null`).get();
  counts.orphanSubmissions = Number(orphan?.n ?? 0);
  const dead = db.select({ n: sql<number>`count(*)` }).from(sessions).where(sql`${sessions.expiresAt} <= ${now}`).get();
  counts.expiredSessions = Number(dead?.n ?? 0);
  const noSites = db
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.id} not in (select ${sites.userId} from ${sites})`)
    .get();
  counts.usersNoSites = Number(noSites?.n ?? 0);

  const totalIssues = Object.values(counts).reduce((s, n) => s + n, 0);
  const base = Math.max(allSites.length, 1);
  const penalty =
    counts.brokenDocs * 5 + counts.emptyDrafts * 2 + counts.staleDrafts * 1 +
    counts.unverifiedDomains * 2 + counts.orphanSubmissions * 0.5 +
    counts.expiredSessions * 0.1 + counts.usersNoSites * 0.5;
  const score = Math.max(0, Math.round(100 - (penalty / base) * 100));

  return { score, siteCount: allSites.length, totalIssues, counts };
}

// ─────────────────────────── Backup status ───────────────────────────

export interface BackupStatus {
  lastAt: string | null;
  byEmail: string | null;
  ageHours: number | null;
}

/** When the DB was last exported (from the audit trail) and how stale that is. */
export function backupStatus(): BackupStatus {
  const last = getDb()
    .select()
    .from(audit)
    .where(inArray(audit.action, ['db.export', 'data.snapshot']))
    .orderBy(desc(audit.createdAt))
    .limit(1)
    .get();
  if (!last) return { lastAt: null, byEmail: null, ageHours: null };
  return {
    lastAt: last.createdAt.toISOString(),
    byEmail: last.actorEmail,
    ageHours: Math.round((Date.now() - last.createdAt.getTime()) / HOUR),
  };
}

/** Purge expired sessions; returns how many rows were removed. */
export function cleanupExpiredSessions(): number {
  const res = getDb().delete(sessions).where(sql`${sessions.expiresAt} <= ${Date.now()}`).run();
  return res.changes;
}

// ─────────────────────────── User dossier ───────────────────────────

export interface DossierSite {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  updatedAt: string;
}

export interface DossierEvent {
  id: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface UserDossier {
  user: { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string };
  online: boolean;
  lastSeen: string | null;
  metrics: { totalActions: number; last24h: number; last7d: number; activeSessions: number; siteCount: number; logins30d: number };
  /** Activity intensity, [weekday Mon-first][hour 0–23], audit actions + logins over 60 days. */
  heatmap: number[][];
  sessions: SessionRow[];
  sites: DossierSite[];
  timeline: DossierEvent[];
}

/** Everything the superadmin needs to know about one user, on one screen. */
export function userDossier(id: string): UserDossier | null {
  const db = getDb();
  const u = db.select().from(users).where(eq(users.id, id)).get();
  if (!u) return null;
  const now = Date.now();

  const userSites = db.select().from(sites).where(eq(sites.userId, id)).orderBy(desc(sites.updatedAt)).all();
  const rawSessions = db.select().from(sessions).where(eq(sessions.userId, id)).orderBy(desc(sessions.createdAt)).limit(50).all();
  const sessionRows = rawSessions.map((s) => toSessionRow(s, u, now));

  const since60d = new Date(now - 60 * DAY);
  const entries = db
    .select()
    .from(audit)
    .where(and(eq(audit.actorId, id), gte(audit.createdAt, since60d)))
    .orderBy(desc(audit.createdAt))
    .limit(2000)
    .all();
  const logins = db
    .select({ at: sessions.createdAt })
    .from(sessions)
    .where(and(eq(sessions.userId, id), gte(sessions.createdAt, since60d)))
    .all();

  const heatmap = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const bump = (d: Date) => { heatmap[(d.getDay() + 6) % 7][d.getHours()]++; };
  let last24h = 0;
  let last7d = 0;
  for (const e of entries) {
    bump(e.createdAt);
    const age = now - e.createdAt.getTime();
    if (age <= DAY) last24h++;
    if (age <= 7 * DAY) last7d++;
  }
  let logins30d = 0;
  for (const l of logins) {
    bump(l.at);
    if (now - l.at.getTime() <= 30 * DAY) logins30d++;
  }

  const total = db.select({ n: sql<number>`count(*)` }).from(audit).where(eq(audit.actorId, id)).get();

  const activeSessions = sessionRows.filter((s) => s.active);
  const seenTimes = activeSessions
    .map((s) => new Date(s.lastActiveAt ?? s.createdAt).getTime());
  const lastSeen = seenTimes.length ? Math.max(...seenTimes) : null;

  return {
    user: { id: u.id, email: u.email, name: u.name, role: u.role as Role, isActive: u.isActive, createdAt: u.createdAt.toISOString() },
    online: lastSeen !== null && now - lastSeen < ONLINE_WINDOW_MS,
    lastSeen: lastSeen !== null ? new Date(lastSeen).toISOString() : null,
    metrics: {
      totalActions: Number(total?.n ?? 0),
      last24h,
      last7d,
      activeSessions: activeSessions.length,
      siteCount: userSites.length,
      logins30d,
    },
    heatmap,
    sessions: sessionRows,
    sites: userSites.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      published: Boolean(s.publishedDoc),
      updatedAt: s.updatedAt.toISOString(),
    })),
    timeline: entries.slice(0, 60).map((e) => ({
      id: e.id,
      action: e.action,
      target: e.target,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
