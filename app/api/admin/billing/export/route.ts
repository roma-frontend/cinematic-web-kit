import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { buildStyledWorkbook } from '@/lib/xlsx-style';
import { recordAudit } from '@/lib/audit';
import { billingDict } from '@/lib/billing-dict';
import { formatPrice, isPlanId, type PlanId } from '@/lib/billing/plans';
import { listSubscriptions, listPayments } from '@/lib/billing/subscriptions';

export const runtime = 'nodejs';

// Superadmin billing export: GET ?type=subscriptions|payments&format=xlsx|csv.
const csvCell = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCsv = (header: string[], rows: unknown[][]): string =>
  '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
const when = (iso: string) => (iso ? iso.replace('T', ' ').slice(0, 19) : '');

export async function GET(request: Request) {
  const locale = await getLocale();
  const t = apiErrors(locale);
  const b = billingDict(locale);
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get('type') ?? 'subscriptions';
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const planName = (p: string) => (isPlanId(p) ? b.planName[p as PlanId] : p);

  let title: string;
  let header: string[];
  let rows: unknown[][];

  if (type === 'payments') {
    title = b.admin.payments;
    header = [b.mine.invoiceNo, b.admin.user, 'Email', b.mine.plan, b.mine.amount, b.mine.status, b.admin.provider, b.mine.date];
    rows = listPayments().map((p) => [
      p.invoiceNumber,
      p.userName,
      p.userEmail,
      planName(p.planId),
      formatPrice(p.amount, p.currency),
      b.status[p.status] ?? p.status,
      p.provider,
      when(p.createdAt),
    ]);
  } else if (type === 'subscriptions') {
    title = b.admin.subscriptions;
    header = [b.admin.user, 'Email', b.mine.plan, b.checkout.interval, b.mine.status, b.admin.provider, b.mine.amount, b.mine.endsOn, b.mine.date];
    rows = listSubscriptions().map((s) => [
      s.userName,
      s.userEmail,
      planName(s.planId),
      b.interval[s.interval as 'month' | 'year'] ?? s.interval,
      b.status[s.status] ?? s.status,
      s.provider,
      formatPrice(s.amount, s.currency),
      when(s.currentPeriodEnd),
      when(s.createdAt),
    ]);
  } else {
    return NextResponse.json({ error: t.unknownExportType }, { status: 400 });
  }

  recordAudit({ id: me.id, email: me.email }, 'billing.export', type, `${format}, ${rows.length}`);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    return new NextResponse(toCsv(header, rows), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cwk-billing-${type}-${stamp}.csv"`,
      },
    });
  }
  const xlsx = buildStyledWorkbook(title, header, rows);
  return new NextResponse(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cwk-billing-${type}-${stamp}.xlsx"`,
    },
  });
}
