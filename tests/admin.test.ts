import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './helpers';
import { getDb, newId, users, sites, sessions, audit, siteUsers, siteMaterials, submissions, domains } from '@/lib/db';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import {
  deviceLabel, listUsers, setUserActive, getUserById, setUserRole, countUsers,
  listAllSites, platformStats, getOrgOverview, assignSiteAdmin, listAssignableUsers,
  listAllSiteUsers, assignSiteUserOrg, setSiteUserStatus, listSessions, countActiveSessions,
  revokeSession, revokeUserSessions, deleteUser, deleteSiteById, unpublishSiteById,
  countSuperadmins, systemInfo, recentActivity, livePulse, securityAlerts, dataQuality,
  backupStatus, cleanupExpiredSessions, userDossier,
} from '@/lib/admin';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function seedSession(userId: string, o: Partial<{ expiresAt: Date; createdAt: Date; lastActiveAt: Date | null; ua: string; ip: string }> = {}) {
  const id = newId('sess');
  getDb().insert(sessions).values({
    id, userId,
    expiresAt: o.expiresAt ?? new Date(Date.now() + DAY),
    createdAt: o.createdAt ?? new Date(),
    lastActiveAt: o.lastActiveAt === undefined ? new Date() : o.lastActiveAt,
    userAgent: o.ua ?? '',
    ip: o.ip ?? '',
  }).run();
  return id;
}

function seedAudit(actorId: string, actorEmail: string, action: string, createdAt: Date, target = '', detail = '') {
  const id = newId('a');
  getDb().insert(audit).values({ id, actorId, actorEmail, action, target, detail, createdAt }).run();
  return id;
}

beforeEach(() => resetDb());

describe('deviceLabel', () => {
  it('handles empty UA', () => {
    expect(deviceLabel('')).toBe('Неизвестное устройство');
  });
  it('detects browsers', () => {
    expect(deviceLabel('Edg/1 Windows')).toBe('Edge · Windows');
    expect(deviceLabel('OPR/1 Android')).toBe('Opera · Android');
    expect(deviceLabel('Chrome/1 Linux')).toBe('Chrome · Linux');
    expect(deviceLabel('Firefox/1 Mac OS X')).toBe('Firefox · macOS');
    expect(deviceLabel('Safari/1 iPhone')).toBe('Safari · iOS');
    expect(deviceLabel('SomethingElse')).toBe('Браузер');
  });
});

describe('user management', () => {
  it('lists, counts and mutates users', () => {
    const su = createUser('a@x.com', 'pw', 'Admin One');
    const cust = createUser('b@x.com', 'pw', 'Cust');
    createSite(su.id, 'Site A');
    // active session (online) + expired session
    seedSession(su.id, { lastActiveAt: new Date() });
    seedSession(cust.id, { expiresAt: new Date(Date.now() - 1000) });

    const rows = listUsers();
    expect(rows.length).toBe(2);
    const suRow = rows.find((r) => r.id === su.id)!;
    expect(suRow.siteCount).toBe(1);
    expect(suRow.online).toBe(true);
    expect(suRow.activeSessions).toBe(1);
    const custRow = rows.find((r) => r.id === cust.id)!;
    expect(custRow.online).toBe(false);
    expect(custRow.lastSeen).toBeNull();

    expect(countUsers()).toBe(2);
    expect(getUserById(su.id)?.email).toBe('a@x.com');
    expect(getUserById('missing')).toBeNull();

    setUserActive(cust.id, false);
    expect(getUserById(cust.id)?.isActive).toBe(false);
    setUserRole(cust.id, 'admin');
    expect(getUserById(cust.id)?.role).toBe('admin');
    expect(countSuperadmins()).toBe(1);
  });
});

describe('sites & stats', () => {
  it('lists all sites and platform stats', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const site = createSite(su.id, 'Cafe');
    getDb().update(sites).set({ publishedDoc: '{"pages":[]}', publishedAt: new Date() }).run();
    const all = listAllSites();
    expect(all.length).toBe(1);
    expect(all[0].ownerEmail).toBe('a@x.com');
    expect(all[0].published).toBe(true);
    const st = platformStats();
    expect(st.users).toBe(1);
    expect(st.sites).toBe(1);
    expect(st.published).toBe(1);
    unpublishSiteById(site.id);
    expect(platformStats().published).toBe(0);
  });
});

describe('org overview & assignment', () => {
  it('returns null for missing org', () => {
    expect(getOrgOverview('nope')).toBeNull();
  });
  it('summarizes an org with members/materials/subs/domains', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const site = createSite(su.id, 'Org');
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: site.id, email: 'm1@x.com', name: 'M1', passwordHash: 'x',
      status: 'pending', rejectionReason: '', phone: '', avatarColor: '', locale: '',
      createdAt: new Date(),
    }).run();
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: site.id, email: 'm2@x.com', name: 'M2', passwordHash: 'x',
      status: 'approved', rejectionReason: '', phone: '', avatarColor: '', locale: '',
      createdAt: new Date(),
    }).run();
    getDb().insert(siteMaterials).values({ id: newId('mat'), siteId: site.id, title: 't', createdAt: new Date() }).run();
    getDb().insert(submissions).values({ id: newId('f'), siteId: site.id, formId: 'contact', data: '{}', createdAt: new Date() }).run();
    getDb().insert(domains).values({ id: newId('d'), siteId: site.id, hostname: 'x.com', verified: false, createdAt: new Date() }).run();

    const ov = getOrgOverview(site.id)!;
    expect(ov.owner?.email).toBe('a@x.com');
    expect(ov.members).toEqual({ total: 2, pending: 1, approved: 1 });
    expect(ov.materials).toBe(1);
    expect(ov.submissions).toBe(1);
    expect(ov.domains).toBe(1);
  });

  it('assignSiteAdmin throws on missing site/user', () => {
    expect(() => assignSiteAdmin('nope', 'x@x.com')).toThrow('SITE_NOT_FOUND');
    const su = createUser('a@x.com', 'pw', 'Owner');
    const site = createSite(su.id, 'Org');
    expect(() => assignSiteAdmin(site.id, 'ghost@x.com')).toThrow('USER_NOT_FOUND');
  });

  it('assignSiteAdmin to existing customer promotes to admin', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const site = createSite(su.id, 'Org');
    const res = assignSiteAdmin(site.id, 'C@X.com');
    expect(res.id).toBe(cust.id);
    expect(getUserById(cust.id)?.role).toBe('admin');
    expect(getDb().select().from(sites).all()[0].userId).toBe(cust.id);
  });

  it('assignSiteAdmin promotes a tenant user into a platform admin', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const site = createSite(su.id, 'Org');
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: site.id, email: 'tenant@x.com', name: 'Ten', passwordHash: 'hash',
      status: 'approved', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();
    const res = assignSiteAdmin(site.id, 'tenant@x.com');
    expect(res.email).toBe('tenant@x.com');
    expect(getUserById(res.id)?.role).toBe('admin');
    expect(getDb().select().from(siteUsers).all().length).toBe(0);
  });

  it('listAssignableUsers dedupes platform over tenant', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const site = createSite(su.id, 'Org');
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: site.id, email: 'tenant@x.com', name: 'Ten', passwordHash: 'h',
      status: 'approved', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: site.id, email: 'a@x.com', name: 'Dup', passwordHash: 'h',
      status: 'approved', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();
    const list = listAssignableUsers();
    expect(list.find((u) => u.email === 'a@x.com')?.source).toBe('platform');
    expect(list.find((u) => u.email === 'tenant@x.com')?.source).toBe('tenant');
  });
});

describe('tenant users', () => {
  it('lists and reassigns tenant users', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const s1 = createSite(su.id, 'Org1');
    const s2 = createSite(su.id, 'Org2');
    const tuId = newId('su');
    getDb().insert(siteUsers).values({
      id: tuId, siteId: s1.id, email: 't@x.com', name: 'T', passwordHash: 'h',
      status: 'pending', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();

    expect(listAllSiteUsers().length).toBe(1);
    expect(listAllSiteUsers()[0].siteName).toBe('Org1');

    setSiteUserStatus(tuId, 'approved');
    expect(getDb().select().from(siteUsers).all()[0].status).toBe('approved');
    setSiteUserStatus(tuId, 'suspended');
    expect(getDb().select().from(siteUsers).all()[0].status).toBe('suspended');

    assignSiteUserOrg(tuId, s2.id);
    expect(getDb().select().from(siteUsers).all()[0].siteId).toBe(s2.id);
  });

  it('assignSiteUserOrg error paths', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const s1 = createSite(su.id, 'Org1');
    expect(() => assignSiteUserOrg('nope', s1.id)).toThrow('USER_NOT_FOUND');
    const tuId = newId('su');
    getDb().insert(siteUsers).values({
      id: tuId, siteId: s1.id, email: 't@x.com', name: 'T', passwordHash: 'h',
      status: 'approved', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();
    expect(() => assignSiteUserOrg(tuId, 'nosite')).toThrow('ORG_NOT_FOUND');
    // email clash in target org
    const s2 = createSite(su.id, 'Org2');
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: s2.id, email: 't@x.com', name: 'Clash', passwordHash: 'h',
      status: 'approved', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();
    expect(() => assignSiteUserOrg(tuId, s2.id)).toThrow('EMAIL_TAKEN');
  });
});

describe('sessions control center', () => {
  it('lists, counts and revokes sessions', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    seedSession(su.id, { ua: 'Chrome/1 Windows' });
    const s2 = seedSession(su.id, { expiresAt: new Date(Date.now() - 1000) });
    const rows = listSessions();
    expect(rows.length).toBe(2);
    expect(rows.some((r) => r.active)).toBe(true);
    expect(countActiveSessions()).toBe(1);
    revokeSession(s2);
    expect(listSessions().length).toBe(1);
    expect(revokeUserSessions(su.id)).toBe(1);
    expect(listSessions().length).toBe(0);
  });
});

describe('deletes & cleanup', () => {
  it('deletes users/sites and expired sessions', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const cust = createUser('b@x.com', 'pw', 'C');
    const site = createSite(cust.id, 'S');
    seedSession(cust.id, { expiresAt: new Date(Date.now() - 1000) });
    expect(cleanupExpiredSessions()).toBe(1);
    deleteSiteById(site.id);
    expect(listAllSites().length).toBe(0);
    deleteUser(cust.id);
    expect(countUsers()).toBe(1);
    expect(getUserById(su.id)).not.toBeNull();
  });
});

describe('systemInfo', () => {
  it('reports db size and integrations', () => {
    const info = systemInfo();
    expect(typeof info.dbSizeKb).toBe('number');
    expect(info.node).toBe(process.version);
    expect(info.integrations).toHaveProperty('muapi');
  });
});

describe('recentActivity & livePulse', () => {
  it('produces a merged feed and windowed pulse', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const site = createSite(su.id, 'S');
    getDb().update(sites).set({ publishedAt: new Date() }).run();
    getDb().insert(submissions).values({ id: newId('f'), siteId: site.id, formId: 'contact', data: '{}', createdAt: new Date() }).run();
    seedSession(su.id);
    const feed = recentActivity();
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.some((e) => e.kind === 'user')).toBe(true);
    const pulse = livePulse();
    expect(pulse.registrations.last24h).toBe(1);
    expect(pulse.submissions.last24h).toBe(1);
    expect(pulse.hotSites.length).toBe(1);
  });

  it('recentActivity handles orphan submission', () => {
    createUser('a@x.com', 'pw', 'Owner');
    getDb().insert(submissions).values({ id: newId('f'), siteId: null, formId: 'x', data: '{}', createdAt: new Date() }).run();
    const feed = recentActivity();
    expect(feed.some((e) => e.kind === 'submission')).toBe(true);
  });
});

describe('securityAlerts', () => {
  it('detects burst, off-hours, exports, roles, sessions', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    const now = Date.now();
    // burst: 3 destructive in 10 min
    seedAudit(su.id, su.email, 'user.delete', new Date(now - 5 * 60 * 1000));
    seedAudit(su.id, su.email, 'site.delete', new Date(now - 4 * 60 * 1000));
    seedAudit(su.id, su.email, 'sessions.revoke_user', new Date(now - 3 * 60 * 1000));
    // off hours sensitive
    const night = new Date(now); night.setHours(2, 30, 0, 0);
    seedAudit(su.id, su.email, 'role.change', night, 'tgt', 'det');
    // notable single events
    seedAudit(su.id, su.email, 'db.export', new Date(now - 60 * 1000));
    seedAudit(su.id, su.email, 'impersonate', new Date(now - 61 * 1000));
    // many sessions
    for (let i = 0; i < 6; i++) seedSession(su.id);

    const { alerts, counts } = securityAlerts();
    expect(alerts.some((a) => a.kind === 'burst')).toBe(true);
    expect(alerts.some((a) => a.kind === 'export')).toBe(true);
    expect(alerts.some((a) => a.kind === 'role_change')).toBe(true);
    expect(alerts.some((a) => a.kind === 'impersonation')).toBe(true);
    expect(alerts.some((a) => a.kind === 'many_sessions')).toBe(true);
    expect(counts.critical + counts.warn + counts.info).toBe(alerts.length);
  });
});

describe('dataQuality', () => {
  it('scores content health', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    createUser('nobody@x.com', 'pw', 'Nobody'); // owns no sites
    // broken doc site
    getDb().insert(sites).values({
      id: newId('s'), userId: su.id, name: 'Broken', slug: 'broken', draftDoc: 'not-json',
      publishedDoc: null, memberApproval: true, publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
    }).run();
    // empty draft (0 blocks), stale
    getDb().insert(sites).values({
      id: newId('s'), userId: su.id, name: 'Empty', slug: 'empty', draftDoc: '{"pages":[]}',
      publishedDoc: null, memberApproval: true, publishedAt: null,
      createdAt: new Date(Date.now() - 30 * DAY), updatedAt: new Date(),
    }).run();
    const dq = dataQuality();
    expect(dq.counts.brokenDocs).toBe(1);
    expect(dq.counts.emptyDrafts).toBe(1);
    expect(dq.counts.staleDrafts).toBe(1);
    expect(dq.counts.usersNoSites).toBe(1);
    expect(dq.score).toBeGreaterThanOrEqual(0);
    expect(dq.score).toBeLessThanOrEqual(100);
  });
});

describe('backupStatus', () => {
  it('is null with no exports and set after one', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    expect(backupStatus().lastAt).toBeNull();
    seedAudit(su.id, su.email, 'db.export', new Date());
    const bs = backupStatus();
    expect(bs.byEmail).toBe('a@x.com');
    expect(bs.ageHours).not.toBeNull();
  });
});

describe('userDossier', () => {
  it('returns null for missing user', () => {
    expect(userDossier('nope')).toBeNull();
  });
  it('assembles a full dossier', () => {
    const su = createUser('a@x.com', 'pw', 'Owner');
    createSite(su.id, 'S');
    seedSession(su.id, { lastActiveAt: new Date() });
    seedAudit(su.id, su.email, 'role.change', new Date(), 'tgt', 'det');
    const d = userDossier(su.id)!;
    expect(d.user.email).toBe('a@x.com');
    expect(d.metrics.siteCount).toBe(1);
    expect(d.metrics.totalActions).toBe(1);
    expect(d.online).toBe(true);
    expect(d.heatmap.length).toBe(7);
    expect(d.timeline.length).toBe(1);
  });
});
