import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { isInterval, isPlanId, type BillingInterval, type PlanId } from '@/lib/billing/plans';
import { stripeConfigured } from '@/lib/billing/provider';
import { getEffectivePlan } from '@/lib/billing/plan-config';
import { upsertSubscription, recordPayment, hasAnySubscription } from '@/lib/billing/subscriptions';
import { recordAudit } from '@/lib/audit';
import { notifySubscription } from '@/lib/notify';

export const runtime = 'nodejs';

// Manual-mode checkout completion (test/no-Stripe). Honors the plan's free
// trial: a first-time subscriber to a plan with trialDays>0 starts in
// 'trialing' with NO charge until the trial ends; otherwise the subscription
// activates and a paid invoice is recorded. Disabled once Stripe is configured.
function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function periodEnd(interval: BillingInterval, from: Date): Date {
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
  const plan = getEffectivePlan(planId);
  const amount = interval === 'year' ? plan.priceYear : plan.priceMonth;
  const now = new Date();

  // Free trial: only for first-time subscribers of a plan that offers one.
  const trialEligible = plan.trialDays > 0 && !hasAnySubscription(me.id);
  const end = trialEligible ? addDays(now, plan.trialDays) : periodEnd(interval, now);

  const subId = upsertSubscription({
    userId: me.id,
    planId,
    interval,
    status: trialEligible ? 'trialing' : 'active',
    provider: 'manual',
    amount,
    currency: plan.currency,
    currentPeriodStart: now,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
  });

  // No charge during a trial — the invoice is recorded when it converts.
  if (!trialEligible) {
    recordPayment({
      userId: me.id,
      subscriptionId: subId,
      planId,
      amount,
      currency: plan.currency,
      status: 'paid',
      provider: 'manual',
      description: `Manual activation — ${planId} (${interval})`,
      periodStart: now,
      periodEnd: end,
    });
  }
  recordAudit(
    { id: me.id, email: me.email },
    trialEligible ? 'billing.trial_start' : 'billing.manual_activate',
    planId,
    interval,
  );
  notifySubscription({
    userEmail: me.email,
    planName: plan.name || planId,
    interval,
    amount: trialEligible ? undefined : `${(amount / 100).toFixed(2)} ${plan.currency.toUpperCase()}`,
    status: trialEligible ? 'trial' : 'active',
  });
  return NextResponse.json({ ok: true, trial: trialEligible });
}
