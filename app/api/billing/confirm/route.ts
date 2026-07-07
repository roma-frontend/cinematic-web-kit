import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { isInterval, isPlanId, PLANS, type BillingInterval, type PlanId } from '@/lib/billing/plans';
import { stripeConfigured } from '@/lib/billing/provider';
import { upsertSubscription, recordPayment } from '@/lib/billing/subscriptions';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Manual-mode checkout completion (test/no-Stripe): activates the subscription
// immediately and records a paid invoice. Disabled once Stripe is configured
// (real money must flow through the provider + webhook).
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
  if (stripeConfigured()) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { planId?: unknown; interval?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }
  if (!isPlanId(body.planId) || !isInterval(body.interval)) {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }
  const planId = body.planId as PlanId;
  const interval = body.interval as BillingInterval;
  const now = new Date();
  const end = periodEnd(interval, now);
  const amount = PLANS[planId].price[interval];

  const subId = upsertSubscription({
    userId: me.id,
    planId,
    interval,
    status: 'active',
    provider: 'manual',
    amount,
    currency: PLANS[planId].currency,
    currentPeriodStart: now,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
  });
  recordPayment({
    userId: me.id,
    subscriptionId: subId,
    planId,
    amount,
    currency: PLANS[planId].currency,
    status: 'paid',
    provider: 'manual',
    description: `Manual activation — ${planId} (${interval})`,
    periodStart: now,
    periodEnd: end,
  });
  recordAudit({ id: me.id, email: me.email }, 'billing.manual_activate', planId, interval);
  return NextResponse.json({ ok: true });
}
