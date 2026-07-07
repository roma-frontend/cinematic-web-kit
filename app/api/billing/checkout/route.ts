import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { isPlanId, isInterval } from '@/lib/billing/plans';
import { createCheckout } from '@/lib/billing/provider';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

// Start a subscription checkout. Returns { url } to redirect the buyer to —
// a Stripe Checkout Session when configured, else an internal manual-confirm
// URL so the flow works with zero config.
export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });

  let body: { planId?: unknown; interval?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }
  if (!isPlanId(body.planId) || !isInterval(body.interval)) {
    return NextResponse.json({ error: t.badRequest }, { status: 400 });
  }

  try {
    const result = await createCheckout({
      userId: me.id,
      email: me.email,
      planId: body.planId,
      interval: body.interval,
    });
    recordAudit({ id: me.id, email: me.email }, 'billing.checkout', body.planId, `${body.interval}, ${result.mode}`);
    return NextResponse.json({ url: result.url, mode: result.mode });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Checkout failed' }, { status: 502 });
  }
}
