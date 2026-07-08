import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb, newId, orgRequests, siteUsers, sites, users, type OrgRequest, type User } from '@/lib/db';
import { createSite } from '@/lib/sites';
import { LANDING_SLUG } from '@/lib/landing-site';
import { publishNotify } from '@/lib/realtime';

// Platform-level organization requests (ported from hr-project). A logged-in
// platform user requests to CREATE a new org (tenant site) or JOIN an existing
// one; a superadmin approves/rejects. On approve of 'create' a site is created
// and owned by the requester; on 'join' the requester becomes that org's admin.

export function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const slugTaken = (slug: string) => Boolean(getDb().select({ id: sites.id }).from(sites).where(eq(sites.slug, slug)).get());

/**
 * Who may use the create/join onboarding at all. Enforced server-side (the UI
 * mirrors it). Superadmins run the platform — they never own a tenant org.
 * Anyone who already owns a site is an org admin and must not re-enter the flow
 * (a `join` would DELETE their platform account + org — see approveOrgRequest).
 */
export function orgEligibility(user: User): { eligible: boolean; reason: 'ok' | 'super' | 'owns'; ownedSiteName: string | null } {
  if (user.role === 'superadmin') return { eligible: false, reason: 'super', ownedSiteName: null };
  const owned = getDb().select({ name: sites.name }).from(sites).where(eq(sites.userId, user.id)).get();
  if (owned) return { eligible: false, reason: 'owns', ownedSiteName: owned.name };
  return { eligible: true, reason: 'ok', ownedSiteName: null };
}

/**
 * Organizations a user may request to JOIN. Excludes: the reserved platform
 * landing, any superadmin-owned site (the platform itself is not an org), the
 * user's own sites, and orgs they already belong to. This is the only list the
 * join dropdown should ever show.
 */
export function listJoinableOrgs(user: User): { id: string; name: string; slug: string }[] {
  const db = getDb();
  const rows = db
    .select({ site: sites, ownerRole: users.role })
    .from(sites)
    .innerJoin(users, eq(sites.userId, users.id))
    .orderBy(asc(sites.name))
    .all();
  const memberSiteIds = new Set(
    db.select({ siteId: siteUsers.siteId })
      .from(siteUsers)
      .where(and(eq(siteUsers.email, user.email), eq(siteUsers.status, 'approved')))
      .all()
      .map((r) => r.siteId),
  );
  return rows
    .filter(({ site, ownerRole }) =>
      site.slug !== LANDING_SLUG &&
      ownerRole !== 'superadmin' &&
      site.userId !== user.id &&
      !memberSiteIds.has(site.id),
    )
    .map(({ site }) => ({ id: site.id, name: site.name, slug: site.slug }));
}

/** Create a pending request. Throws on validation problems. */
export function createOrgRequest(
  user: User,
  input: { type: 'create' | 'join'; requestedName?: string; requestedSlug?: string; targetSiteId?: string; message?: string },
): OrgRequest {
  // Eligibility gate (defense-in-depth; the UI hides the form for these users).
  const elig = orgEligibility(user);
  if (!elig.eligible) throw new Error(elig.reason === 'super' ? 'SUPERADMIN_NO_ORG' : 'ALREADY_HAS_ORG');

  // Only one pending request at a time per requester.
  const existing = getDb()
    .select({ id: orgRequests.id })
    .from(orgRequests)
    .where(and(eq(orgRequests.requesterId, user.id), eq(orgRequests.status, 'pending')))
    .get();
  if (existing) throw new Error('PENDING_EXISTS');

  const now = new Date();
  let requestedName = '';
  let requestedSlug = '';
  let targetSiteId: string | null = null;

  if (input.type === 'create') {
    requestedName = (input.requestedName ?? '').trim();
    if (!requestedName) throw new Error('NAME_REQUIRED');
    requestedSlug = normalizeSlug(input.requestedSlug || requestedName);
    if (!requestedSlug) throw new Error('SLUG_INVALID');
    if (slugTaken(requestedSlug)) throw new Error('SLUG_TAKEN');
  } else {
    targetSiteId = (input.targetSiteId ?? '').trim();
    // Must be a real, joinable organization — never the landing, a superadmin
    // site, your own site, or one you already belong to.
    if (!listJoinableOrgs(user).some((o) => o.id === targetSiteId)) throw new Error('INVALID_TARGET');
  }

  const row: OrgRequest = {
    id: newId('or'),
    type: input.type,
    requesterId: user.id,
    requesterEmail: user.email,
    requesterName: user.name,
    requestedName,
    requestedSlug,
    targetSiteId,
    message: (input.message ?? '').slice(0, 500),
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: '',
    resultSiteId: null,
    createdAt: now,
  };
  getDb().insert(orgRequests).values(row).run();
  // Real-time: light up every superadmin's header bell (best-effort).
  publishNotify({ kind: 'org-request', superadmin: true, at: now.toISOString() });
  return row;
}

export function getMyOrgRequests(userId: string): OrgRequest[] {
  return getDb().select().from(orgRequests).where(eq(orgRequests.requesterId, userId)).orderBy(desc(orgRequests.createdAt)).all();
}

export interface OrgRequestRow extends OrgRequest {
  targetName: string | null;
}

export function listOrgRequests(status?: 'pending' | 'approved' | 'rejected'): OrgRequestRow[] {
  const db = getDb();
  const rows = status
    ? db.select().from(orgRequests).where(eq(orgRequests.status, status)).orderBy(desc(orgRequests.createdAt)).all()
    : db.select().from(orgRequests).orderBy(desc(orgRequests.createdAt)).all();
  return rows.map((r) => {
    let targetName: string | null = null;
    if (r.targetSiteId) targetName = db.select({ name: sites.name }).from(sites).where(eq(sites.id, r.targetSiteId)).get()?.name ?? null;
    return { ...r, targetName };
  });
}

export function countPendingOrgRequests(): number {
  return getDb().select({ id: orgRequests.id }).from(orgRequests).where(eq(orgRequests.status, 'pending')).all().length;
}

/** Superadmin approval (enforced in the route). Creates/assigns the org. */
export function approveOrgRequest(superadminId: string, requestId: string): { siteId: string } {
  const db = getDb();
  const req = db.select().from(orgRequests).where(eq(orgRequests.id, requestId)).get();
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'pending') throw new Error('ALREADY_REVIEWED');

  let siteId: string;
  if (req.type === 'create') {
    if (req.requestedSlug && slugTaken(req.requestedSlug)) throw new Error('SLUG_TAKEN');
    const site = createSite(req.requesterId, req.requestedName || 'Организация');
    // Honour the requested slug when still free.
    if (req.requestedSlug && !slugTaken(req.requestedSlug)) {
      db.update(sites).set({ slug: req.requestedSlug }).where(eq(sites.id, site.id)).run();
    }
    // Promote a plain customer to admin (they now run an organization).
    const owner = db.select().from(users).where(eq(users.id, req.requesterId)).get();
    if (owner && owner.role === 'customer') db.update(users).set({ role: 'admin' }).where(eq(users.id, owner.id)).run();
    siteId = site.id;
  } else {
    if (!req.targetSiteId) throw new Error('ORG_NOT_FOUND');
    // Join = become a regular TENANT member (site_user) of that organization —
    // they see the site + admin materials in the tenant account (/s/<slug>/account),
    // NOT the platform dashboard. Reuse the requester's platform credentials so
    // they can sign in on the tenant site with the same email/password.
    const requester = db.select().from(users).where(eq(users.id, req.requesterId)).get();
    if (requester) {
      const exists = db
        .select({ id: siteUsers.id })
        .from(siteUsers)
        .where(and(eq(siteUsers.siteId, req.targetSiteId), eq(siteUsers.email, requester.email)))
        .get();
      if (exists) {
        db.update(siteUsers).set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() }).where(eq(siteUsers.id, exists.id)).run();
      } else {
        const now = new Date();
        db.insert(siteUsers).values({
          id: newId('su'), siteId: req.targetSiteId, email: requester.email, name: requester.name,
          passwordHash: requester.passwordHash, status: 'approved', approvedBy: superadminId, approvedAt: now,
          rejectionReason: '', phone: '', avatarColor: '', emailNotify: true, marketing: false, locale: '',
          createdAt: now, updatedAt: now, lastLoginAt: now,
        }).run();
      }
      // No duplicate identities: a tenant member must NOT also exist as a
      // platform user. Remove the platform account (owns nothing here) — their
      // sessions/pending request cascade away. They now live only in site_users.
      db.delete(users).where(eq(users.id, req.requesterId)).run();
    }
    siteId = req.targetSiteId;
    // The org_request row cascaded away with the user; nothing more to update.
    return { siteId };
  }

  db.update(orgRequests)
    .set({ status: 'approved', reviewedBy: superadminId, reviewedAt: new Date(), resultSiteId: siteId })
    .where(eq(orgRequests.id, requestId))
    .run();
  return { siteId };
}

export function rejectOrgRequest(superadminId: string, requestId: string, reason = ''): void {
  const req = getDb().select({ status: orgRequests.status }).from(orgRequests).where(eq(orgRequests.id, requestId)).get();
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.status !== 'pending') throw new Error('ALREADY_REVIEWED');
  getDb()
    .update(orgRequests)
    .set({ status: 'rejected', reviewedBy: superadminId, reviewedAt: new Date(), rejectionReason: reason.slice(0, 300) })
    .where(eq(orgRequests.id, requestId))
    .run();
}
