'use client';

import { useState } from 'react';
import { Layers, Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useLocale } from '@/hooks/use-locale';

// Org-admin catalog editor: create/edit/delete the member plans shown on the
// tenant landing. Prices are entered in major units and stored as cents; Stripe
// checkout is created later on the platform account, not by the org admin.

export interface PlanDTO {
  id: string; name: string; description: string; amountCents: number;
  currency: string; interval: 'month' | 'year'; perks: string[]; active: boolean; sortOrder: number; synced: boolean;
}

const DICT = {
  ru: {
    title: 'Планы участников', subtitle: 'Каталог платных планов — отображается на лендинге вашей организации.',
    add: 'Добавить план', empty: 'Планов пока нет. Создайте первый.',
    name: 'Название', desc: 'Описание', price: 'Цена', per: 'Период', month: 'в месяц', year: 'в год',
    perks: 'Что входит (по строке на пункт)', active: 'Активен', save: 'Сохранить', cancel: 'Отмена',
    edit: 'Изменить', del: 'Удалить', delConfirm: 'Удалить этот план?',
    delDesc: 'План будет удалён из каталога и перестанет показываться на лендинге. Действующие подписки не затрагиваются. Это действие необратимо.',
    cancel2: 'Отмена',
    inactive: 'скрыт',
  },
  en: {
    title: 'Member plans', subtitle: 'Your catalog of paid plans — shown on your organization’s landing.',
    add: 'Add plan', empty: 'No plans yet. Create the first one.',
    name: 'Name', desc: 'Description', price: 'Price', per: 'Interval', month: 'per month', year: 'per year',
    perks: 'What’s included (one per line)', active: 'Active', save: 'Save', cancel: 'Cancel',
    edit: 'Edit', del: 'Delete', delConfirm: 'Delete this plan?',
    delDesc: 'The plan will be removed from your catalog and hidden from the landing. Existing subscriptions are unaffected. This cannot be undone.',
    cancel2: 'Cancel',
    inactive: 'hidden',
  },
  hy: {
    title: 'Մասնակիցների պլաններ', subtitle: 'Ձեր վճարովի պլանների կատալոգը՝ ցուցադրվում է լենդինգում։',
    add: 'Ավելացնել պլան', empty: 'Դեռ պլաններ չկան։',
    name: 'Անվանում', desc: 'Նկարագրություն', price: 'Գին', per: 'Պարբերություն', month: 'ամսական', year: 'տարեկան',
    perks: 'Ինչ է ներառված (մեկ տողում)', active: 'Ակտիվ', save: 'Պահպանել', cancel: 'Չեղարկել',
    edit: 'Խմբագրել', del: 'Ջնջել', delConfirm: 'Ջնջե՞լ այս պլանը։',
    delDesc: 'Պլանը կհեռացվի կատալոգից և կթաքցվի լենդինգից։ Գործող բաժանորդագրությունները չեն ազդվի։ Այս գործողությունը անդառնալի է։',
    cancel2: 'Չեղարկել',
    inactive: 'թաքցված',
  },
} as const;

type Draft = { id?: string; name: string; description: string; price: string; currency: string; interval: 'month' | 'year'; perks: string; active: boolean };

const emptyDraft = (): Draft => ({ name: '', description: '', price: '', currency: 'usd', interval: 'month', perks: '', active: true });
const toDraft = (p: PlanDTO): Draft => ({ id: p.id, name: p.name, description: p.description, price: (p.amountCents / 100).toString(), currency: p.currency, interval: p.interval, perks: p.perks.join('\n'), active: p.active });

async function api(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/site-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json().catch(() => ({}));
}

export function SitePlans({ siteId, initial }: { siteId: string; initial: PlanDTO[] }) {
  const locale = useLocale().locale as keyof typeof DICT;
  const t = DICT[locale] ?? DICT.en;
  const [plans, setPlans] = useState<PlanDTO[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const reload = async () => {
    const res = await fetch(`/api/site-members?site=${encodeURIComponent(siteId)}`);
    const d = await res.json().catch(() => ({}));
    if (Array.isArray(d.plans)) setPlans(d.plans as PlanDTO[]);
  };

  const money = (cents: number, cur: string) =>
    new Intl.NumberFormat(locale === 'hy' ? 'hy-AM' : locale, { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 2 }).format(cents / 100);

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setBusy(true);
    const perks = draft.perks.split('\n').map((s) => s.trim()).filter(Boolean);
    const amountCents = Math.max(0, Math.round(parseFloat(draft.price.replace(',', '.')) * 100 || 0));
    const payload = {
      siteId, name: draft.name.trim(), description: draft.description.trim(),
      amountCents, currency: draft.currency.trim() || 'usd', interval: draft.interval, perks, active: draft.active,
    };
    await api(draft.id ? { action: 'plan-update', planId: draft.id, ...payload } : { action: 'plan-create', ...payload });
    await reload();
    setDraft(null); setBusy(false);
  };

  const remove = async (id: string) => {
    const ok = await confirm({ title: t.delConfirm, description: t.delDesc, confirmLabel: t.del, cancelLabel: t.cancel2, tone: 'danger' });
    if (!ok) return;
    setBusy(true);
    await api({ action: 'plan-delete', siteId, planId: id });
    await reload();
    setBusy(false);
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-6">
      {confirmDialog}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Layers className="h-5 w-5" /></span>
          <div>
            <h3 className="font-bold tracking-tight">{t.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
        {!draft && <Button onClick={() => setDraft(emptyDraft())} className="gap-1.5"><Plus className="h-4 w-4" /> {t.add}</Button>}
      </div>

      {draft && (
        <div className="mt-5 space-y-3 rounded-xl border border-border bg-background/60 p-4">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t.name} className="h-10" />
          <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={t.desc} className="h-10" />
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-muted-foreground">{t.price}</label>
              <div className="flex gap-2">
                <Input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="9.99" inputMode="decimal" className="h-10" />
                <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} className="h-10 w-20 uppercase" maxLength={3} />
              </div>
            </div>
            <div className="min-w-32">
              <label className="text-xs font-medium text-muted-foreground">{t.per}</label>
              <select value={draft.interval} onChange={(e) => setDraft({ ...draft, interval: e.target.value as 'month' | 'year' })} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                <option value="month">{t.month}</option>
                <option value="year">{t.year}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.perks}</label>
            <textarea value={draft.perks} onChange={(e) => setDraft({ ...draft, perks: e.target.value })} rows={4} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> {t.active}
          </label>
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={busy || !draft.name.trim()} className="gap-1.5">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.save}</Button>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy} className="gap-1.5"><X className="h-4 w-4" /> {t.cancel}</Button>
          </div>
        </div>
      )}

      <ul className="mt-5 space-y-2">
        {plans.length === 0 && !draft && <li className="text-sm text-muted-foreground">{t.empty}</li>}
        {plans.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.name || '—'}</span>
                <span className="text-sm text-muted-foreground">{money(p.amountCents, p.currency)} · {p.interval === 'year' ? t.year : t.month}</span>
                {!p.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t.inactive}</span>}
              </div>
              {p.description && <p className="mt-0.5 truncate text-sm text-muted-foreground">{p.description}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDraft(toDraft(p))} aria-label={t.edit}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(p.id)} aria-label={t.del}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
