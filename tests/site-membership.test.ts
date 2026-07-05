import { describe, it, expect, beforeEach } from 'vitest';
import {
  requireSiteOwner,
  listMembers,
  notifyMember,
  setMemberStatus,
  listMaterialsForAdmin,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  listPublishedMaterials,
} from '@/lib/site-membership';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import { createSiteUser, getSiteUserById, listNotifications, countUnreadNotifications } from '@/lib/site-auth';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seed() {
  const superadmin = createUser('super@example.com', 'password123', 'Super'); // first => superadmin
  const owner = createUser('owner@example.com', 'password123', 'Owner');       // customer
  const site = createSite(owner.id, 'Org');
  return { superadmin, owner, site };
}

describe('requireSiteOwner', () => {
  it('returns the site for the owner', () => {
    const { owner, site } = seed();
    expect(requireSiteOwner(owner, site.id).id).toBe(site.id);
  });

  it('allows a superadmin to bypass ownership', () => {
    const { superadmin, site } = seed();
    expect(requireSiteOwner(superadmin, site.id).id).toBe(site.id);
  });

  it('throws SITE_NOT_FOUND for a missing site', () => {
    const { owner } = seed();
    expect(() => requireSiteOwner(owner, 'ghost')).toThrow('SITE_NOT_FOUND');
  });

  it('throws FORBIDDEN for a non-owner non-superadmin', () => {
    const { site } = seed();
    const stranger = createUser('stranger@example.com', 'password123', 'S'); // customer
    expect(() => requireSiteOwner(stranger, site.id)).toThrow('FORBIDDEN');
  });
});

describe('listMembers', () => {
  it('lists members newest first, scoped by site', () => {
    const { owner, site } = seed();
    createSiteUser(site.id, 'a@x.com', 'password123', 'A', 'pending');
    createSiteUser(site.id, 'b@x.com', 'password123', 'B', 'approved');
    const other = createSite(owner.id, 'Other');
    createSiteUser(other.id, 'c@x.com', 'password123');
    const rows = listMembers(site.id);
    expect(rows.length).toBe(2);
    expect(rows[0]).toHaveProperty('email');
  });
});

describe('notifyMember', () => {
  it('inserts a notification row', () => {
    const { site } = seed();
    const m = createSiteUser(site.id, 'm@x.com', 'password123');
    notifyMember(site.id, m.id, 'info', 'Hello', 'World');
    const notes = listNotifications(site.id, m.id);
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('Hello');
  });
});

describe('setMemberStatus', () => {
  it('approves a member, sets approvedBy/At and notifies', () => {
    const { owner, site } = seed();
    const m = createSiteUser(site.id, 'm@x.com', 'password123', 'M', 'pending');
    setMemberStatus(site.id, m.id, 'approved', owner.id);
    const updated = getSiteUserById(site.id, m.id)!;
    expect(updated.status).toBe('approved');
    expect(updated.approvedBy).toBe(owner.id);
    expect(updated.approvedAt).not.toBeNull();
    expect(countUnreadNotifications(site.id, m.id)).toBe(1);
    expect(listNotifications(site.id, m.id)[0].type).toBe('join_approved');
  });

  it('rejects with a reason and notifies', () => {
    const { owner, site } = seed();
    const m = createSiteUser(site.id, 'r@x.com', 'password123', 'R', 'pending');
    setMemberStatus(site.id, m.id, 'rejected', owner.id, 'spam');
    const updated = getSiteUserById(site.id, m.id)!;
    expect(updated.status).toBe('rejected');
    expect(updated.rejectionReason).toBe('spam');
    expect(listNotifications(site.id, m.id)[0].type).toBe('join_rejected');
  });

  it('rejects without a reason (default message branch)', () => {
    const { owner, site } = seed();
    const m = createSiteUser(site.id, 'r2@x.com', 'password123', 'R', 'pending');
    setMemberStatus(site.id, m.id, 'rejected', owner.id);
    expect(listNotifications(site.id, m.id).length).toBe(1);
  });

  it('suspends with and without a reason', () => {
    const { owner, site } = seed();
    const m1 = createSiteUser(site.id, 's1@x.com', 'password123', 'S', 'approved');
    setMemberStatus(site.id, m1.id, 'suspended', owner.id, 'abuse');
    expect(getSiteUserById(site.id, m1.id)!.status).toBe('suspended');
    expect(listNotifications(site.id, m1.id)[0].type).toBe('suspended');

    const m2 = createSiteUser(site.id, 's2@x.com', 'password123', 'S', 'approved');
    setMemberStatus(site.id, m2.id, 'suspended', owner.id);
    expect(listNotifications(site.id, m2.id).length).toBe(1);
  });

  it('setting pending does not notify', () => {
    const { owner, site } = seed();
    const m = createSiteUser(site.id, 'p@x.com', 'password123', 'P', 'approved');
    setMemberStatus(site.id, m.id, 'pending', owner.id);
    expect(getSiteUserById(site.id, m.id)!.status).toBe('pending');
    expect(listNotifications(site.id, m.id).length).toBe(0);
  });
});

describe('materials admin CRUD', () => {
  it('creates a published material and notifies approved members', () => {
    const { owner, site } = seed();
    const approved = createSiteUser(site.id, 'ap@x.com', 'password123', 'AP', 'approved');
    const pending = createSiteUser(site.id, 'pe@x.com', 'password123', 'PE', 'pending');
    const mat = createMaterial(site.id, owner.id, { title: 'Guide', body: 'B', url: 'http://x', published: true });
    expect(mat.title).toBe('Guide');
    expect(listMaterialsForAdmin(site.id).length).toBe(1);
    // approved member notified, pending not
    expect(countUnreadNotifications(site.id, approved.id)).toBe(1);
    expect(countUnreadNotifications(site.id, pending.id)).toBe(0);
  });

  it('creates an unpublished material without notifying (default title branch)', () => {
    const { owner, site } = seed();
    const approved = createSiteUser(site.id, 'ap@x.com', 'password123', 'AP', 'approved');
    createMaterial(site.id, owner.id, { published: false });
    expect(countUnreadNotifications(site.id, approved.id)).toBe(0);
    expect(listMaterialsForAdmin(site.id)[0].title).toBe('');
  });

  it('notifies with fallback message when published with empty title', () => {
    const { owner, site } = seed();
    const approved = createSiteUser(site.id, 'ap@x.com', 'password123', 'AP', 'approved');
    createMaterial(site.id, owner.id, { published: true });
    expect(countUnreadNotifications(site.id, approved.id)).toBe(1);
  });

  it('defaults published to true when omitted', () => {
    const { owner, site } = seed();
    const mat = createMaterial(site.id, owner.id, { title: 'X' });
    expect(mat.published).toBe(true);
  });

  it('updates a material (whitelisted fields, scoped by site)', () => {
    const { owner, site } = seed();
    const mat = createMaterial(site.id, owner.id, { title: 'Old', published: false });
    updateMaterial(site.id, mat.id, { title: 'New', body: 'Body', url: 'u', published: true });
    const reloaded = listMaterialsForAdmin(site.id)[0];
    expect(reloaded.title).toBe('New');
    expect(reloaded.body).toBe('Body');
    expect(reloaded.url).toBe('u');
    expect(reloaded.published).toBe(true);
  });

  it('updateMaterial ignores non-matching types (no-op keeps values)', () => {
    const { owner, site } = seed();
    const mat = createMaterial(site.id, owner.id, { title: 'Keep', published: true });
    updateMaterial(site.id, mat.id, {} as any);
    expect(listMaterialsForAdmin(site.id)[0].title).toBe('Keep');
  });

  it('deletes a material (scoped by site)', () => {
    const { owner, site } = seed();
    const mat = createMaterial(site.id, owner.id, { title: 'Del' });
    deleteMaterial(site.id, mat.id);
    expect(listMaterialsForAdmin(site.id).length).toBe(0);
  });
});

describe('listPublishedMaterials', () => {
  it('returns only published materials, newest first', () => {
    const { owner, site } = seed();
    createMaterial(site.id, owner.id, { title: 'Pub', published: true });
    createMaterial(site.id, owner.id, { title: 'Draft', published: false });
    const list = listPublishedMaterials(site.id);
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('Pub');
  });
});
