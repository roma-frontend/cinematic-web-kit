import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getDb, users } from '@/lib/db';
import { getPayment } from '@/lib/billing/subscriptions';
import { billingDict } from '@/lib/billing-dict';
import { formatPrice, isPlanId, type PlanId } from '@/lib/billing/plans';
import { renderInvoicePdf } from '@/lib/pdf';

export const runtime = 'nodejs';

// GET /api/billing/invoice/[id] → PDF invoice. Owner or superadmin only.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const locale = await getLocale();
  const t = apiErrors(locale);
  const b = billingDict(locale);
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });

  const { id } = await ctx.params;
  const payment = getPayment(id);
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (payment.userId !== me.id && !isSuperadmin(me)) {
    return NextResponse.json({ error: t.forbidden }, { status: 403 });
  }

  const buyer = getDb().select().from(users).where(eq(users.id, payment.userId)).get();
  const planLabel = isPlanId(payment.planId) ? b.planName[payment.planId as PlanId] : payment.planId;
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  const pdf = renderInvoicePdf({
    invoiceNumber: payment.invoiceNumber || payment.id,
    date: fmtDate(payment.createdAt),
    sellerName: 'Builder Studio',
    sellerNote: process.env.NEXT_PUBLIC_APP_HOST || '',
    buyerName: buyer?.name ?? '',
    buyerEmail: buyer?.email ?? '',
    planLabel,
    intervalLabel: '',
    periodLabel:
      payment.periodStart && payment.periodEnd
        ? `${fmtDate(payment.periodStart)} — ${fmtDate(payment.periodEnd)}`
        : undefined,
    amountLabel: formatPrice(payment.amount, payment.currency),
    statusLabel: b.status[payment.status] ?? payment.status,
    labels: {
      invoice: b.mine.invoices,
      billTo: b.mine.title,
      description: b.admin.subscriptions,
      amount: b.mine.amount,
      total: b.checkout.total,
      status: b.mine.status,
      date: b.mine.date,
      number: b.mine.invoiceNo,
      period: b.mine.endsOn,
    },
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${payment.invoiceNumber || 'invoice'}.pdf"`,
    },
  });
}
