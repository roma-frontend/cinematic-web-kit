import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from '@/lib/auth';
import { createSite, getSite, parseDoc, publishSite, saveDraft } from '@/lib/sites';
import { createPlan, updatePlan, deletePlan, listPlansForAdmin, listActivePlans } from '@/lib/site-plans';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seedSite() {
  const u = createUser('owner@example.com', 'password123', 'Owner');
  return createSite(u.id, 'Tenant');
}

describe('site plan catalog', () => {
  it('creates a local plan for platform-managed checkout', async () => {
    const s = seedSite();
    const plan = await createPlan(s.id, { name: 'Gold', amountCents: 999, interval: 'month', perks: ['A', 'B'] });
    expect(plan.name).toBe('Gold');
    expect(plan.amountCents).toBe(999);
    expect(plan.interval).toBe('month');
    expect(plan.perks).toEqual(['A', 'B']);
    expect(plan.synced).toBe(false); // provider objects are created at checkout time
    expect(listPlansForAdmin(s.id)).toHaveLength(1);
  });

  it('lists only active plans for the landing, ordered by sortOrder', async () => {
    const s = seedSite();
    await createPlan(s.id, { name: 'B', amountCents: 200, sortOrder: 2 });
    await createPlan(s.id, { name: 'A', amountCents: 100, sortOrder: 1 });
    await createPlan(s.id, { name: 'Hidden', amountCents: 300, active: false });
    const active = listActivePlans(s.id);
    expect(active.map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('updates only provided fields', async () => {
    const s = seedSite();
    const p = await createPlan(s.id, { name: 'Base', amountCents: 500, interval: 'month' });
    await updatePlan(s.id, p.id, { amountCents: 1500, interval: 'year' });
    const after = listPlansForAdmin(s.id)[0];
    expect(after.name).toBe('Base'); // unchanged
    expect(after.amountCents).toBe(1500);
    expect(after.interval).toBe('year');
  });

  it('clamps perks to strings and caps the list', async () => {
    const s = seedSite();
    const many = Array.from({ length: 30 }, (_, i) => `perk ${i}`);
    const p = await createPlan(s.id, { name: 'X', amountCents: 100, perks: many });
    expect(p.perks.length).toBeLessThanOrEqual(20);
  });

  it('deletes a plan', async () => {
    const s = seedSite();
    const p = await createPlan(s.id, { name: 'Temp', amountCents: 100 });
    deletePlan(s.id, p.id);
    expect(listPlansForAdmin(s.id)).toHaveLength(0);
  });

  it('isolates catalogs per site', async () => {
    const s1 = seedSite();
    const u2 = createUser('o2@example.com', 'password123', 'O2');
    const s2 = createSite(u2.id, 'T2');
    await createPlan(s1.id, { name: 'S1', amountCents: 100 });
    await createPlan(s2.id, { name: 'S2', amountCents: 100 });
    expect(listPlansForAdmin(s1.id).map((p) => p.name)).toEqual(['S1']);
    expect(listPlansForAdmin(s2.id).map((p) => p.name)).toEqual(['S2']);
  });

  it('syncs published builder pricing cards into payable member plans', () => {
    const s = seedSite();
    const doc = parseDoc(s.draftDoc);
    expect(doc).not.toBeNull();
    doc!.pages[0].blocks = [{
      id: 'pricing-section',
      type: 'section',
      props: {},
      children: [
        { id: 'free', type: 'pricing', props: { plan: 'START', price: '0₽', period: '/мес', features: 'Базовый набор' } },
        { id: 'pro', type: 'pricing', props: { plan: 'PRO', price: '990₽', period: '/мес', features: 'Всё в Start\nПоддержка' } },
      ],
    }];
    saveDraft(s, doc!);
    const fresh = { ...s, draftDoc: JSON.stringify(doc) };
    publishSite(fresh);

    const plans = listActivePlans(s.id);
    expect(plans.map((p) => p.name)).toEqual(['PRO']);
    expect(plans[0].amountCents).toBe(99_000);
    expect(plans[0].currency).toBe('rub');
    const published = parseDoc(getSite(s.id)?.publishedDoc ?? null);
    expect(published?.pages[0].blocks[0].children?.[1].props.planId).toMatch(/^bplan_/);
  });

  it('a deleted builder plan is not resurrected by re-seed on empty catalog', () => {
    const s = seedSite();
    const doc = parseDoc(s.draftDoc)!;
    doc.pages[0].blocks = [{
      id: 'pricing-section', type: 'section', props: {},
      children: [
        { id: 'pro', type: 'pricing', props: { plan: 'PRO', price: '990₽', period: '/мес', features: 'A' } },
      ],
    }];
    saveDraft(s, doc);
    publishSite({ ...s, draftDoc: JSON.stringify(doc) });

    const [plan] = listPlansForAdmin(s.id);
    expect(plan.name).toBe('PRO');
    deletePlan(s.id, plan.id);
    // Catalog is now empty → ensureBuilderPlansFromPublished would normally
    // re-seed from the published pricing cards, but the delete must stick.
    expect(listPlansForAdmin(s.id)).toHaveLength(0);
    expect(listActivePlans(s.id)).toHaveLength(0);
  });
});
