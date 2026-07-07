import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from './helpers';
import { createUser } from '@/lib/auth';
import {
  upsertSubscription,
  getActiveSubscription,
  cancelSubscription,
  recordPayment,
  nextInvoiceNumber,
  computeMetrics,
  markEventProcessed,
  listSubscriptions,
  listPayments,
} from '@/lib/billing/subscriptions';
import { getUserEntitlements } from '@/lib/billing/entitlements';

beforeEach(() => resetDb());

// First created user becomes superadmin; make a customer as the 2nd account.
function makeCustomer(email = 'c@x.com') {
  createUser('owner@x.com', 'pw', 'Owner'); // superadmin bootstrap
  return createUser(email, 'pw', 'Customer');
}

describe('subscriptions data layer', () => {
  it('activates and resolves the active subscription', () => {
    const u = makeCustomer();
    const future = new Date(Date.now() + 30 * 864e5);
    upsertSubscription({
      userId: u.id, planId: 'studio', interval: 'month', status: 'active',
      provider: 'manual', currentPeriodEnd: future,
    });
    const sub = getActiveSubscription(u.id);
    expect(sub?.planId).toBe('studio');
  });

  it('an expired period is not active', () => {
    const u = makeCustomer();
    upsertSubscription({
      userId: u.id, planId: 'pro', interval: 'month', status: 'active',
      provider: 'manual', currentPeriodEnd: new Date(Date.now() - 864e5),
    });
    expect(getActiveSubscription(u.id)).toBeNull();
  });

  it('cancel-at-period-end still grants until period lapses; hard cancel revokes', () => {
    const u = makeCustomer();
    const id = upsertSubscription({
      userId: u.id, planId: 'pro', interval: 'month', status: 'active',
      provider: 'manual', currentPeriodEnd: new Date(Date.now() + 864e5),
    });
    cancelSubscription(id, true);
    expect(getActiveSubscription(u.id)?.id).toBe(id);
    cancelSubscription(id, false);
    expect(getActiveSubscription(u.id)).toBeNull();
  });

  it('invoice numbers increment per year', () => {
    const a = nextInvoiceNumber(new Date('2026-01-01'));
    expect(a).toMatch(/^CWK-2026-0001$/);
    const u = makeCustomer();
    recordPayment({ userId: u.id, planId: 'pro', amount: 2900, status: 'paid', provider: 'manual' });
    const b = nextInvoiceNumber(new Date('2026-06-01'));
    expect(b).toBe('CWK-2026-0002');
  });

  it('recordPayment dedupes on providerInvoiceId', () => {
    const u = makeCustomer();
    const p1 = recordPayment({ userId: u.id, planId: 'pro', amount: 2900, status: 'paid', provider: 'stripe', providerInvoiceId: 'in_1' });
    const p2 = recordPayment({ userId: u.id, planId: 'pro', amount: 2900, status: 'paid', provider: 'stripe', providerInvoiceId: 'in_1' });
    expect(p1.id).toBe(p2.id);
    expect(listPayments().length).toBe(1);
  });
});

describe('entitlements', () => {
  it('superadmin is unlimited', () => {
    const su = createUser('root@x.com', 'pw', 'Root'); // superadmin
    const e = getUserEntitlements(su);
    expect(e.unlimited).toBe(true);
    expect(e.has('builder.customCss')).toBe(true);
  });

  it('no subscription = no paid features', () => {
    const u = makeCustomer();
    const e = getUserEntitlements(u);
    expect(e.has('builder.animation')).toBe(false);
    expect(e.planId).toBeNull();
  });

  it('studio subscription unlocks the full builder; pro does not', () => {
    const u = makeCustomer();
    upsertSubscription({ userId: u.id, planId: 'pro', interval: 'month', status: 'active', provider: 'manual', currentPeriodEnd: new Date(Date.now() + 864e5) });
    expect(getUserEntitlements(u).has('builder.effects')).toBe(false);
    upsertSubscription({ userId: u.id, planId: 'studio', interval: 'month', status: 'active', provider: 'manual', currentPeriodEnd: new Date(Date.now() + 864e5) });
    const e = getUserEntitlements(u);
    expect(e.has('builder.effects')).toBe(true);
    expect(e.limits.sites).toBeNull();
  });
});

describe('metrics + idempotency', () => {
  it('computes MRR with yearly amortization and revenue', () => {
    const u = makeCustomer();
    const future = new Date(Date.now() + 30 * 864e5);
    upsertSubscription({ userId: u.id, planId: 'studio', interval: 'year', status: 'active', provider: 'manual', currentPeriodEnd: future });
    recordPayment({ userId: u.id, planId: 'studio', amount: 79000, status: 'paid', provider: 'manual' });
    const m = computeMetrics();
    expect(m.activeCount).toBe(1);
    expect(m.mrr).toBe(Math.round(79000 / 12));
    expect(m.arr).toBe(m.mrr * 12);
    expect(m.totalRevenue).toBe(79000);
    expect(m.byPlan.studio).toBe(1);
    expect(listSubscriptions().length).toBe(1);
  });

  it('markEventProcessed is idempotent', () => {
    expect(markEventProcessed('evt_1', 'invoice.paid', 'stripe', '{}')).toBe(true);
    expect(markEventProcessed('evt_1', 'invoice.paid', 'stripe', '{}')).toBe(false);
  });
});
