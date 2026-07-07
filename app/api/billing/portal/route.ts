import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getDb, subscriptions } from '@/lib/db';
import { getActiveSubscription, cancelSubscription } from '@/lib/billing/subscriptions';
import { createPortalSession, cancelStripeSubscription } from '@/lib/billing/provider';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Self-service subscription management for the signed-in user:
//   { action: 'portal' }  → Stripe Billing Portal URL (when configured)
//   { action: 'cancel' }  → cancel at period end (+ tell Stripe)
//   { action: 'resume' }  → undo a pending cancellation
export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }

  const sub = getActiveSubscription(me.id);
  if (!sub) return NextResponse.json({ error: t.badRequest }, { status: 400 });

  if (body.action === 'portal') {
    const url = await createPortalSession(sub.providerCustomerId);
    return NextResponse.json({ url });
  }

  if (body.action === 'cancel') {
    cancelSubscription(sub.id, true);
    await cancelStripeSubscription(sub.providerSubId, true).catch(() => {});
    recordAudit({ id: me.id, email: me.email }, 'billing.cancel', sub.planId, sub.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'resume') {
    getDb().update(subscriptions).set({ cancelAtPeriodEnd: false, updatedAt: new Date() }).where(eq(subscriptions.id, sub.id)).run();
    recordAudit({ id: me.id, email: me.email }, 'billing.resume', sub.planId, sub.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: t.badRequest }, { status: 400 });
}
