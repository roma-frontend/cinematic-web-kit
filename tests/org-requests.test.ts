import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './helpers';
import { getDb, newId, users, sites, siteUsers, orgRequests } from '@/lib/db';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import {
  normalizeSlug, createOrgRequest, getMyOrgRequests, listOrgRequests,
  countPendingOrgRequests, approveOrgRequest, rejectOrgRequest,
} from '@/lib/org-requests';

beforeEach(() => resetDb());

describe('normalizeSlug', () => {
  it('kebab-cases and strips', () => {
    expect(normalizeSlug('Hello World!!')).toBe('hello-world');
    expect(normalizeSlug('--A__B--')).toBe('a-b');
    expect(normalizeSlug('!!!')).toBe('');
  });
});

describe('createOrgRequest', () => {
  it('create type validations', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    expect(() => createOrgRequest(cust, { type: 'create' })).toThrow('NAME_REQUIRED');
    expect(() => createOrgRequest(cust, { type: 'create', requestedName: 'Org', requestedSlug: '!!!' })).toThrow('SLUG_INVALID');
    // valid create
    const req = createOrgRequest(cust, { type: 'create', requestedName: 'My Org', message: 'hi' });
    expect(req.requestedSlug).toBe('my-org');
    expect(req.status).toBe('pending');
    // only one pending allowed
    expect(() => createOrgRequest(cust, { type: 'create', requestedName: 'Another' })).toThrow('PENDING_EXISTS');
  });

  it('rejects taken slug', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const site = createSite(su.id, 'Existing');
    expect(() => createOrgRequest(cust, { type: 'create', requestedName: 'X', requestedSlug: site.slug })).toThrow('SLUG_TAKEN');
  });

  it('join type validations', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    expect(() => createOrgRequest(cust, { type: 'join', targetSiteId: 'nope' })).toThrow('ORG_NOT_FOUND');
    const site = createSite(su.id, 'Org');
    const req = createOrgRequest(cust, { type: 'join', targetSiteId: site.id });
    expect(req.targetSiteId).toBe(site.id);
  });
});

describe('queries', () => {
  it('getMyOrgRequests, listOrgRequests, countPending', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const site = createSite(su.id, 'Target Org');
    createOrgRequest(cust, { type: 'join', targetSiteId: site.id });

    expect(getMyOrgRequests(cust.id).length).toBe(1);
    expect(countPendingOrgRequests()).toBe(1);
    const all = listOrgRequests();
    expect(all[0].targetName).toBe('Target Org');
    expect(listOrgRequests('pending').length).toBe(1);
    expect(listOrgRequests('approved').length).toBe(0);
  });
});

describe('approveOrgRequest', () => {
  it('errors on missing / already reviewed', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    expect(() => approveOrgRequest(su.id, 'nope')).toThrow('REQUEST_NOT_FOUND');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const req = createOrgRequest(cust, { type: 'create', requestedName: 'Org' });
    approveOrgRequest(su.id, req.id);
    expect(() => approveOrgRequest(su.id, req.id)).toThrow('ALREADY_REVIEWED');
  });

  it('create: builds site, honours slug, promotes customer', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const req = createOrgRequest(cust, { type: 'create', requestedName: 'Coffee', requestedSlug: 'coffee-shop' });
    const { siteId } = approveOrgRequest(su.id, req.id);
    const site = getDb().select().from(sites).all().find((s) => s.id === siteId)!;
    expect(site.slug).toBe('coffee-shop');
    expect(getDb().select().from(users).all().find((u) => u.id === cust.id)?.role).toBe('admin');
    expect(getDb().select().from(orgRequests).all()[0].status).toBe('approved');
  });

  it('create: throws when slug taken at approval', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const req = createOrgRequest(cust, { type: 'create', requestedName: 'Org', requestedSlug: 'taken-slug' });
    createSite(su.id, 'blocker');
    getDb().update(sites).set({ slug: 'taken-slug' }).run();
    expect(() => approveOrgRequest(su.id, req.id)).toThrow('SLUG_TAKEN');
  });

  it('join: creates a tenant member and removes the platform user', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const site = createSite(su.id, 'Org');
    const req = createOrgRequest(cust, { type: 'join', targetSiteId: site.id });
    const { siteId } = approveOrgRequest(su.id, req.id);
    expect(siteId).toBe(site.id);
    const members = getDb().select().from(siteUsers).all();
    expect(members.length).toBe(1);
    expect(members[0].email).toBe('c@x.com');
    expect(members[0].status).toBe('approved');
    expect(getDb().select().from(users).all().find((u) => u.id === cust.id)).toBeUndefined();
  });

  it('join: re-approves an existing tenant member', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const site = createSite(su.id, 'Org');
    getDb().insert(siteUsers).values({
      id: newId('su'), siteId: site.id, email: 'c@x.com', name: 'Cust', passwordHash: 'h',
      status: 'pending', rejectionReason: '', phone: '', avatarColor: '', locale: '', createdAt: new Date(),
    }).run();
    const req = createOrgRequest(cust, { type: 'join', targetSiteId: site.id });
    approveOrgRequest(su.id, req.id);
    const members = getDb().select().from(siteUsers).all();
    expect(members.length).toBe(1);
    expect(members[0].status).toBe('approved');
  });

  it('join: throws ORG_NOT_FOUND when targetSiteId missing', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const id = newId('or');
    getDb().insert(orgRequests).values({
      id, type: 'join', requesterId: cust.id, requesterEmail: cust.email, requesterName: cust.name,
      requestedName: '', requestedSlug: '', targetSiteId: null, message: '', status: 'pending',
      reviewedBy: null, reviewedAt: null, rejectionReason: '', resultSiteId: null, createdAt: new Date(),
    }).run();
    expect(() => approveOrgRequest(su.id, id)).toThrow('ORG_NOT_FOUND');
  });
});

describe('rejectOrgRequest', () => {
  it('errors and rejects', () => {
    const su = createUser('a@x.com', 'pw', 'Admin');
    expect(() => rejectOrgRequest(su.id, 'nope')).toThrow('REQUEST_NOT_FOUND');
    const cust = createUser('c@x.com', 'pw', 'Cust');
    const req = createOrgRequest(cust, { type: 'create', requestedName: 'Org' });
    rejectOrgRequest(su.id, req.id, 'bad');
    expect(getDb().select().from(orgRequests).all()[0].status).toBe('rejected');
    expect(() => rejectOrgRequest(su.id, req.id)).toThrow('ALREADY_REVIEWED');
  });
});
