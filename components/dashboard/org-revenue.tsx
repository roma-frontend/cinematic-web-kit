'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wallet, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';

// Superadmin platform-commerce console: per-org collected revenue + a manual
// payout ledger. All member money is on the platform Stripe; the superadmin
// settles balances to org admins here.

interface OrgBilling {
  siteId: string; siteName: string; currency: string;
  collectedCents: number; feeCents: number; paidOutCents: number; balanceCents: number; payments: number;
}

const DICT = {
  ru: { title: 'Выручка организаций', subtitle: 'Все платежи участников собираются на счёте платформы. Здесь — выручка по орг-м и выплаты админам.',
    fee: 'Комиссия платформы', org: 'Организация', collected: 'Собрано', feeCol: 'Комиссия', paidOut: 'Выплачено', balance: 'К выплате', pay: 'Выплатить',
    empty: 'Пока нет платежей.', payTitle: 'Записать выплату', amount: 'Сумма', note: 'Заметка (необязательно)', save: 'Записать', cancel: 'Отмена', payments: 'платежей' },
  en: { title: 'Organization revenue', subtitle: 'All member payments are collected on the platform account. Here: per-org revenue and payouts to admins.',
    fee: 'Platform fee', org: 'Organization', collected: 'Collected', feeCol: 'Fee', paidOut: 'Paid out', balance: 'Owed', pay: 'Pay out',
    empty: 'No payments yet.', payTitle: 'Record a payout', amount: 'Amount', note: 'Note (optional)', save: 'Record', cancel: 'Cancel', payments: 'payments' },
  hy: { title: 'Կազմակերպությունների եկամուտ', subtitle: 'Բոլոր վճարումները հավաքվում են հարթակի հաշվին։ Այստեղ՝ եկամուտն ըստ կազմ-ի և վճարումներ ադմիններին։',
    fee: 'Հարթակի միջնորդավճար', org: 'Կազմակերպություն', collected: 'Հավաքված', feeCol: 'Միջնորդավճար', paidOut: 'Վճարված', balance: 'Ենթակա', pay: 'Վճարել',
    empty: 'Դեռ վճարումներ չկան։', payTitle: 'Գրանցել վճարում', amount: 'Գումար', note: 'Նշում', save: 'Գրանցել', cancel: 'Չեղարկել', payments: 'վճարում' },
} as const;

async function api(method: 'GET' | 'POST', body?: Record<string, unknown>, qs = ''): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/admin/revenue${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

export function OrgRevenue({ canEdit = true }: { canEdit?: boolean }) {
  const locale = useLocale().locale as keyof typeof DICT;
  const t = DICT[locale] ?? DICT.en;
  const [orgs, setOrgs] = useState<OrgBilling[]>([]);
  const [feePercent, setFeePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState<OrgBilling | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await api('GET');
    if (Array.isArray(d.orgs)) setOrgs(d.orgs as OrgBilling[]);
    if (typeof d.feePercent === 'number') setFeePercent(d.feePercent);
    setLoading(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const money = (cents: number, cur: string) =>
    new Intl.NumberFormat(locale === 'hy' ? 'hy-AM' : locale, { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 2 }).format(cents / 100);

  const openPay = (o: OrgBilling) => { setPayFor(o); setAmount((o.balanceCents / 100).toString()); setNote(''); };
  const submitPay = async () => {
    if (!payFor) return;
    const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100 || 0);
    if (amountCents <= 0) return;
    setBusy(true);
    await api('POST', { action: 'record-payout', siteId: payFor.siteId, amountCents, currency: payFor.currency, note });
    await load();
    setPayFor(null); setBusy(false);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
          {feePercent > 0 && <p className="mt-1 text-xs text-muted-foreground">{t.fee}: {feePercent}%</p>}
        </div>
      </div>

      {orgs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="mt-5 -mx-3 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{t.org}</th>
                <th className="py-2 px-3 font-medium">{t.collected}</th>
                <th className="py-2 px-3 font-medium">{t.feeCol}</th>
                <th className="py-2 px-3 font-medium">{t.paidOut}</th>
                <th className="py-2 px-3 font-medium">{t.balance}</th>
                <th className="py-2 pl-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.siteId} className="border-b border-border/50">
                  <td className="py-2.5 pr-3"><span className="font-medium">{o.siteName || '—'}</span><span className="ml-1 text-xs text-muted-foreground">· {o.payments} {t.payments}</span></td>
                  <td className="py-2.5 px-3">{money(o.collectedCents, o.currency)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{money(o.feeCents, o.currency)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{money(o.paidOutCents, o.currency)}</td>
                  <td className="py-2.5 px-3 font-semibold">{money(o.balanceCents, o.currency)}</td>
                  <td className="py-2.5 pl-3 text-right">
                    {canEdit && <Button size="sm" variant="outline" disabled={o.balanceCents <= 0} onClick={() => openPay(o)} className="gap-1.5">{t.pay}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && payFor && (
        <div className="mt-5 space-y-3 rounded-xl border border-border bg-background/60 p-4">
          <p className="text-sm font-semibold">{t.payTitle} — {payFor.siteName}</p>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.amount} ({payFor.currency.toUpperCase()})</label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="h-10 w-40" />
            </div>
            <div className="min-w-48 flex-1">
              <label className="text-xs font-medium text-muted-foreground">{t.note}</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={submitPay} disabled={busy} className="gap-1.5">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.save}</Button>
            <Button variant="outline" onClick={() => setPayFor(null)} disabled={busy}>{t.cancel}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
