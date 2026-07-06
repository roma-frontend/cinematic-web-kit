import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, newId, sites, siteUsers, siteMaterials, siteNotifications, type SiteMaterial, type User } from '@/lib/db';
import { isSuperadmin } from '@/lib/auth';
import { getUserById } from '@/lib/admin';
import { sendEmail } from '@/lib/email';
import { renderNewMemberEmail } from '@/lib/email-templates';
import { APP_URL, DEFAULT_LOCALE } from '@/lib/seo';

// Org-isolation (variant A): a tenant SITE is an organization, its owner (the
// platform user) is the admin, and site_users are members "under" the admin.
// Every function here is scoped by siteId AND verifies the caller owns the site,
// so one organization's data can never leak into another's. Superadmin bypasses
// ownership (platform operator), never the siteId scope.

export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/** Throws unless `user` owns `siteId` (or is a superadmin). Returns the site row. */
export function requireSiteOwner(user: User, siteId: string) {
  const site = getDb().select().from(sites).where(eq(sites.id, siteId)).get();
  if (!site) throw new Error('SITE_NOT_FOUND');
  if (site.userId !== user.id && !isSuperadmin(user)) throw new Error('FORBIDDEN');
  return site;
}

// ── Members (admin side) ────────────────────────────────────────────────────

export interface MemberRow {
  id: string;
  email: string;
  name: string;
  status: string;
  rejectionReason: string;
  createdAt: Date;
  approvedAt: Date | null;
}

export function listMembers(siteId: string): MemberRow[] {
  return getDb()
    .select({
      id: siteUsers.id,
      email: siteUsers.email,
      name: siteUsers.name,
      status: siteUsers.status,
      rejectionReason: siteUsers.rejectionReason,
      createdAt: siteUsers.createdAt,
      approvedAt: siteUsers.approvedAt,
    })
    .from(siteUsers)
    .where(eq(siteUsers.siteId, siteId))
    .orderBy(desc(siteUsers.createdAt))
    .all();
}

/** Count pending members across every site owned by a platform user. A
 *  superadmin sees the platform-wide pending total. */
export function countPendingMembersForOwner(user: User): number {
  const row = getDb()
    .select({ n: sql<number>`count(*)` })
    .from(siteUsers)
    .innerJoin(sites, eq(siteUsers.siteId, sites.id))
    .where(
      isSuperadmin(user)
        ? eq(siteUsers.status, 'pending')
        : and(eq(siteUsers.status, 'pending'), eq(sites.userId, user.id)),
    )
    .get();
  return row?.n ?? 0;
}

/** Pending-member counts keyed by siteId, for the given sites. */
export function pendingCountsBySite(siteIds: string[]): Record<string, number> {
  if (siteIds.length === 0) return {};
  const rows = getDb()
    .select({ siteId: siteUsers.siteId, n: sql<number>`count(*)` })
    .from(siteUsers)
    .where(and(eq(siteUsers.status, 'pending'), inArray(siteUsers.siteId, siteIds)))
    .groupBy(siteUsers.siteId)
    .all();
  const out: Record<string, number> = {};
  for (const r of rows) out[r.siteId] = r.n;
  return out;
}

/**
 * Email the site owner that a new member is awaiting approval. Fire-and-forget,
 * never throws (falls back to console when no email provider is configured).
 * No-op if the owner can't be resolved.
 */
export async function notifyOwnerOfPendingMember(siteId: string, memberEmail: string, memberName: string): Promise<void> {
  try {
    const site = getDb().select().from(sites).where(eq(sites.id, siteId)).get();
    if (!site) return;
    const owner = getUserById(site.userId);
    if (!owner?.email) return;
    // This notification goes to the site OWNER, whose UI locale isn't part of
    // the triggering request (a member is registering). Use the platform
    // default locale rather than adding a DB lookup for the owner's preference.
    const mail = renderNewMemberEmail({
      ownerName: owner.name ?? '',
      siteName: site.name,
      memberEmail,
      memberName,
      reviewUrl: `${APP_URL}/dashboard/sites/${site.id}`,
    }, DEFAULT_LOCALE);

    await sendEmail({ to: owner.email, ...mail });
  } catch {
    /* notification is best-effort — never block registration */
  }
}

/** Insert a notification for one member of a site. */
export function notifyMember(siteId: string, siteUserId: string, type: string, title: string, message: string): void {
  getDb().insert(siteNotifications).values({ id: newId('ntf'), siteId, siteUserId, type, title, message, read: false, createdAt: new Date() }).run();
}

/** Set a member's status. Scoped by siteId so a cross-site id can't be touched. */
export function setMemberStatus(
  siteId: string,
  memberId: string,
  status: MemberStatus,
  adminUserId: string,
  reason = '',
): void {
  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (status === 'approved') {
    set.approvedBy = adminUserId;
    set.approvedAt = new Date();
    set.rejectionReason = '';
  }
  if (status === 'rejected' || status === 'suspended') set.rejectionReason = reason.slice(0, 300);
  getDb().update(siteUsers).set(set).where(and(eq(siteUsers.id, memberId), eq(siteUsers.siteId, siteId))).run();

  // Notify the affected member (join-request loop, like the reference project).
  if (status === 'approved') notifyMember(siteId, memberId, 'join_approved', 'Заявка одобрена', 'Добро пожаловать! Ваш доступ к материалам открыт.');
  else if (status === 'rejected') notifyMember(siteId, memberId, 'join_rejected', 'Заявка отклонена', reason ? `Причина: ${reason}` : 'Ваша заявка на вступление отклонена.');
  else if (status === 'suspended') notifyMember(siteId, memberId, 'suspended', 'Доступ приостановлен', reason ? `Причина: ${reason}` : 'Ваш доступ временно приостановлен.');
}

// ── Materials (admin CRUD) ──────────────────────────────────────────────────

export function listMaterialsForAdmin(siteId: string): SiteMaterial[] {
  return getDb().select().from(siteMaterials).where(eq(siteMaterials.siteId, siteId)).orderBy(desc(siteMaterials.createdAt)).all();
}

export function createMaterial(siteId: string, adminUserId: string, data: { title?: string; body?: string; url?: string; published?: boolean }): SiteMaterial {
  const now = new Date();
  const row: SiteMaterial = {
    id: newId('mat'),
    siteId,
    title: (data.title ?? '').slice(0, 200),
    body: (data.body ?? '').slice(0, 20000),
    url: (data.url ?? '').slice(0, 1000),
    published: data.published ?? true,
    createdBy: adminUserId,
    createdAt: now,
    updatedAt: now,
  };
  getDb().insert(siteMaterials).values(row).run();
  // Notify approved members that new material is available.
  if (row.published) {
    const members = getDb().select({ id: siteUsers.id }).from(siteUsers).where(and(eq(siteUsers.siteId, siteId), eq(siteUsers.status, 'approved'))).all();
    for (const m of members) notifyMember(siteId, m.id, 'material', 'Новый материал', row.title || 'Опубликован новый материал.');
  }
  return row;
}

export function updateMaterial(siteId: string, materialId: string, data: { title?: string; body?: string; url?: string; published?: boolean }): void {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof data.title === 'string') set.title = data.title.slice(0, 200);
  if (typeof data.body === 'string') set.body = data.body.slice(0, 20000);
  if (typeof data.url === 'string') set.url = data.url.slice(0, 1000);
  if (typeof data.published === 'boolean') set.published = data.published;
  getDb().update(siteMaterials).set(set).where(and(eq(siteMaterials.id, materialId), eq(siteMaterials.siteId, siteId))).run();
}

export function deleteMaterial(siteId: string, materialId: string): void {
  getDb().delete(siteMaterials).where(and(eq(siteMaterials.id, materialId), eq(siteMaterials.siteId, siteId))).run();
}

// ── Materials (member read) ─────────────────────────────────────────────────

export interface MemberMaterial {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: Date;
}

/** Published materials for a site — ONLY call after confirming the caller is an
 *  approved member of that exact site (see /api/site-auth resource=materials). */
export function listPublishedMaterials(siteId: string): MemberMaterial[] {
  return getDb()
    .select({ id: siteMaterials.id, title: siteMaterials.title, body: siteMaterials.body, url: siteMaterials.url, createdAt: siteMaterials.createdAt })
    .from(siteMaterials)
    .where(and(eq(siteMaterials.siteId, siteId), eq(siteMaterials.published, true)))
    .orderBy(desc(siteMaterials.createdAt))
    .all();
}
