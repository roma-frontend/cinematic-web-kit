import { describe, it, expect, beforeEach } from 'vitest';
import { LANDING_SLUG, getLandingSite, getOrCreateLandingSite } from '@/lib/landing-site';
import { parseDoc } from '@/lib/sites';
import { createUser } from '@/lib/auth';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

describe('getLandingSite', () => {
  it('returns null when no landing site exists', () => {
    expect(getLandingSite()).toBeNull();
  });
});

describe('getOrCreateLandingSite', () => {
  it('returns null when there are no users to own it', () => {
    expect(getOrCreateLandingSite()).toBeNull();
  });

  it('creates a seeded landing owned by the first user (draft only)', () => {
    const owner = createUser('owner@example.com', 'password123', 'Owner');
    const site = getOrCreateLandingSite()!;
    expect(site).not.toBeNull();
    expect(site.slug).toBe(LANDING_SLUG);
    expect(site.userId).toBe(owner.id);
    expect(site.publishedDoc).toBeNull();
    expect(site.publishedAt).toBeNull();
    const doc = parseDoc(site.draftDoc);
    expect(doc?.pages.length).toBeGreaterThan(0);
    expect((doc as any)?.brand).toBe('Cinematic Web Kit');
  });

  it('is idempotent — returns the existing landing on subsequent calls', () => {
    createUser('owner@example.com', 'password123', 'Owner');
    const first = getOrCreateLandingSite()!;
    const second = getOrCreateLandingSite()!;
    expect(second.id).toBe(first.id);
    expect(getLandingSite()?.id).toBe(first.id);
  });

  it('picks the earliest-created user as owner', () => {
    const first = createUser('first@example.com', 'password123', 'First');
    createUser('second@example.com', 'password123', 'Second');
    const site = getOrCreateLandingSite()!;
    expect(site.userId).toBe(first.id);
  });
});
