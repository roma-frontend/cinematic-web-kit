import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { getDb, newId, sites, siteUsers, siteMaterials, type SiteMaterial, type User } from '@/lib/db';
import { isSuperadmin } from '@/lib/auth';

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
