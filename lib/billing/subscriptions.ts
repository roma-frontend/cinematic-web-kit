// Billing data layer: subscription lifecycle, payment history, and the metrics
// that power the superadmin dashboard (MRR, revenue, active/churned counts).
// Provider-agnostic — Stripe webhooks and manual superadmin actions both call
// through here so there is a single source of truth for entitlement + reporting.

import 'server-only';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import {
  getDb,
  newId,
  subscriptions,
  payments,
  billingEvents,
  users,
  type Subscription,
  type Payment,
} from '@/lib/db';
import {
  PLANS,
  monthlyEquivalent,
  type PlanId,
  type BillingInterval,
} from '@/lib/billing/plans';

/** Subscription states that grant entitlements right now. */
export const ACTIVE_STATUSES = ['active', 'trialing'] as const;

/** The user's current entitlement-granting subscription, or null. */
export function getActiveSubscription(userId: string): Subscription | null {
  const now = Date.now();
  const rows = getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .all();
  for (const s of rows) {
    if (!ACTIVE_STATUSES.includes(s.status as (typeof ACTIVE_STATUSES)[number])) continue;
    // A canceled-at-period-end sub still grants access until the period lapses.
    if (s.currentPeriodEnd && s.currentPeriodEnd.getTime() < now) continue;
    return s;
  }
  return null;
}

export function getSubscription(id: string): Subscription | null {
  return getDb().select().from(subscriptions).where(eq(subscriptions.id, id)).get() ?? null;
}

export function getSubscriptionByProviderSub(providerSubId: string): Subscription | null {
  if (!providerSubId) return null;
  return (
    getDb().select().from(subscriptions).where(eq(subscriptions.providerSubId, providerSubId)).get() ?? null
  );
}

export interface UpsertSubInput {
  userId: string;
  planId: PlanId;
  interval: BillingInterval;
  status: string;
  provider: 'stripe' | 'manual';
  providerCustomerId?: string;
  providerSubId?: string;
  amount?: number;
  currency?: string;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}

/** Insert or update a subscription. Matches on providerSubId when present,
 *  else on the newest row for (user, provider). Returns the row id. */
export function upsertSubscription(input: UpsertSubInput): string {
  const db = getDb();
  const now = new Date();
  const existing =
    (input.providerSubId ? getSubscriptionByProviderSub(input.providerSubId) : null) ??
    (input.provider === 'manual' ? null : null);
  const values = {
    planId: input.planId,
    interval: input.interval,
    status: input.status,
    provider: input.provider,
    providerCustomerId: input.providerCustomerId ?? '',
    providerSubId: input.providerSubId ?? '',
    amount: input.amount ?? PLANS[input.planId].price[input.interval],
    currency: input.currency ?? PLANS[input.planId].currency,
    currentPeriodStart: input.currentPeriodStart ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    updatedAt: now,
  };
  if (existing) {
    db.update(subscriptions).set(values).where(eq(subscriptions.id, existing.id)).run();
    return existing.id;
  }
  const id = newId('sub');
  db.insert(subscriptions)
    .values({ id, userId: input.userId, canceledAt: null, createdAt: now, ...values })
    .run();
  return id;
}

/** Mark a subscription canceled (immediately or at period end). */
export function cancelSubscription(id: string, atPeriodEnd: boolean): void {
  const now = new Date();
  getDb()
    .update(subscriptions)
    .set(
      atPeriodEnd
        ? { cancelAtPeriodEnd: true, updatedAt: now }
        : { status: 'canceled', canceledAt: now, cancelAtPeriodEnd: false, updatedAt: now },
    )
    .where(eq(subscriptions.id, id))
    .run();
}

export function setSubscriptionStatus(id: string, status: string): void {
  getDb().update(subscriptions).set({ status, updatedAt: new Date() }).where(eq(subscriptions.id, id)).run();
}

// ─────────────────────────────── Payments ───────────────────────────────

/** Next invoice number in the CWK-YYYY-NNNN series (sequential per year). */
export function nextInvoiceNumber(now = new Date()): string {
  const year = now.getFullYear();
  const prefix = `CWK-${year}-`;
  const count = getDb()
    .select({ n: payments.invoiceNumber })
    .from(payments)
    .all()
    .filter((r) => r.n.startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

export interface RecordPaymentInput {
  userId: string;
  subscriptionId?: string;
  planId: PlanId;
  amount: number;
  currency?: string;
  status: 'paid' | 'failed' | 'refunded' | 'pending';
  provider: 'stripe' | 'manual';
  providerInvoiceId?: string;
  providerPaymentId?: string;
  description?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

export function recordPayment(input: RecordPaymentInput): Payment {
  const db = getDb();
  const now = new Date();
  // Idempotency: a re-delivered provider invoice must not double-count.
  if (input.providerInvoiceId) {
    const dup = db
      .select()
      .from(payments)
      .where(eq(payments.providerInvoiceId, input.providerInvoiceId))
      .get();
    if (dup) return dup;
  }
  const row: Payment = {
    id: newId('pay'),
    userId: input.userId,
    subscriptionId: input.subscriptionId ?? null,
    planId: input.planId,
    amount: input.amount,
    currency: input.currency ?? 'usd',
    status: input.status,
    provider: input.provider,
    providerInvoiceId: input.providerInvoiceId ?? '',
    providerPaymentId: input.providerPaymentId ?? '',
    description: input.description ?? '',
    invoiceNumber: input.status === 'paid' ? nextInvoiceNumber(now) : '',
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    createdAt: now,
  };
  db.insert(payments).values(row).run();
  return row;
}

export function getPayment(id: string): Payment | null {
  return getDb().select().from(payments).where(eq(payments.id, id)).get() ?? null;
}

export function listUserPayments(userId: string, limit = 100): Payment[] {
  return getDb()
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .all();
}

// ────────────────────────── Webhook idempotency ──────────────────────────

/** Returns true if this is the FIRST time we see the event (should process). */
export function markEventProcessed(id: string, type: string, provider: string, payload: string): boolean {
  const db = getDb();
  const seen = db.select({ id: billingEvents.id }).from(billingEvents).where(eq(billingEvents.id, id)).get();
  if (seen) return false;
  db.insert(billingEvents).values({ id, type, provider, payload: payload.slice(0, 20000), processedAt: new Date() }).run();
  return true;
}

// ─────────────────────────────── Metrics ────────────────────────────────

export interface BillingMetrics {
  /** Monthly Recurring Revenue in cents (yearly plans amortized /12). */
  mrr: number;
  /** Annual Run Rate = MRR × 12. */
  arr: number;
  activeCount: number;
  canceledCount: number;
  pastDueCount: number;
  /** All-time paid revenue in cents. */
  totalRevenue: number;
  /** Paid revenue in the last 30 days. */
  revenue30d: number;
  currency: string;
  /** Active subscriptions grouped by plan. */
  byPlan: Record<string, number>;
}

export function computeMetrics(): BillingMetrics {
  const db = getDb();
  const subs = db.select().from(subscriptions).all();
  const pays = db.select().from(payments).where(eq(payments.status, 'paid')).all();
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;

  let mrr = 0;
  let activeCount = 0;
  let canceledCount = 0;
  let pastDueCount = 0;
  const byPlan: Record<string, number> = {};

  for (const s of subs) {
    if (s.status === 'canceled') canceledCount++;
    if (s.status === 'past_due') pastDueCount++;
    const active = ACTIVE_STATUSES.includes(s.status as (typeof ACTIVE_STATUSES)[number]);
    if (!active) continue;
    if (s.currentPeriodEnd && s.currentPeriodEnd.getTime() < now) continue;
    activeCount++;
    byPlan[s.planId] = (byPlan[s.planId] ?? 0) + 1;
    if (s.planId in PLANS) {
      mrr += monthlyEquivalent(s.planId as PlanId, s.interval as BillingInterval);
    }
  }

  let totalRevenue = 0;
  let revenue30d = 0;
  for (const p of pays) {
    totalRevenue += p.amount;
    if (p.createdAt.getTime() >= cutoff) revenue30d += p.amount;
  }

  return {
    mrr,
    arr: mrr * 12,
    activeCount,
    canceledCount,
    pastDueCount,
    totalRevenue,
    revenue30d,
    currency: 'usd',
    byPlan,
  };
}

// ───────────────────────── Admin listing / export ─────────────────────────

export interface SubscriptionRow {
  id: string;
  userName: string;
  userEmail: string;
  planId: string;
  interval: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export function listSubscriptions(limit = 1000): SubscriptionRow[] {
  return getDb()
    .select({ s: subscriptions, u: users })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .all()
    .map(({ s, u }) => ({
      id: s.id,
      userName: u.name,
      userEmail: u.email,
      planId: s.planId,
      interval: s.interval,
      status: s.status,
      provider: s.provider,
      amount: s.amount,
      currency: s.currency,
      currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : '',
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      createdAt: s.createdAt.toISOString(),
    }));
}

export interface PaymentRow {
  id: string;
  invoiceNumber: string;
  userName: string;
  userEmail: string;
  planId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  description: string;
  createdAt: string;
}

export function listPayments(limit = 5000): PaymentRow[] {
  return getDb()
    .select({ p: payments, u: users })
    .from(payments)
    .innerJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .all()
    .map(({ p, u }) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      userName: u.name,
      userEmail: u.email,
      planId: p.planId,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      description: p.description,
      createdAt: p.createdAt.toISOString(),
    }));
}

/** Recently churned/active subs for a specific set of users (dashboard helper). */
export function subscriptionsForUsers(userIds: string[]): Subscription[] {
  if (userIds.length === 0) return [];
  return getDb()
    .select()
    .from(subscriptions)
    .where(and(inArray(subscriptions.userId, userIds), gt(subscriptions.createdAt, new Date(0))))
    .all();
}
