import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUser, isSuperadmin, normalizeEmail } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getDb, users } from '@/lib/db';
import { isInterval, isPlanId, PLANS, type BillingInterval, type PlanId } from '@/lib/billing/plans';
import { upsertSubscription, recordPayment, getActiveSubscription, cancelSubscription } from '@/lib/billing/subscriptions';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Superadmin: grant a plan to a user by email (test/promo, no payment), or
// revoke a user's active subscription. Body: { email, planId, interval } or
// { email, action:'revoke' }.
function periodEnd(interval: BillingInterval, from = new Date()): Date {
  const d = new Date(from);
  if (interval === 'year') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { email?: string; planId?: unknown; interval?: unknown; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }

  const target = getDb().select().from(users).where(eq(users.email, normalizeEmail(body.email ?? ''))).get();
  if (!target) return NextResponse.json({ error: t.userNotFound }, { status: 404 });

  if (body.action === 'revoke') {
    const sub = getActiveSubscription(target.id);
    if (sub) cancelSubscription(sub.id, false);
    recordAudit({ id: me.id, email: me.email }, 'billing.revoke', target.email, sub?.planId ?? '');
    return NextResponse.json({ ok: true });
  }

  if (!isPlanId(body.planId) || !isInterval(body.interval)) {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }
  const planId = body.planId as PlanId;
  const interval = body.interval as BillingInterval;
  const now = new Date();
  const end = periodEnd(interval, now);

  const subId = upsertSubscription({
    userId: target.id,
    planId,
    interval,
    status: 'active',
    provider: 'manual',
    amount: 0,
    currency: PLANS[planId].currency,
    currentPeriodStart: now,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
  });
  recordPayment({
    userId: target.id,
    subscriptionId: subId,
    planId,
    amount: 0,
    currency: PLANS[planId].currency,
    status: 'paid',
    provider: 'manual',
    description: `Granted by ${me.email}`,
    periodStart: now,
    periodEnd: end,
  });
  recordAudit({ id: me.id, email: me.email }, 'billing.grant', target.email, `${planId}/${interval}`);
  return NextResponse.json({ ok: true });
}
