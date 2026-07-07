import { redirect } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { isCapabilityEnabled } from '@/lib/access';
import { listAudit } from '@/lib/audit';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { getLocale } from '@/lib/i18n';
import { BCP47 } from '@/lib/seo';

const DICT = {
  ru: { title: 'Журнал аудита', subtitle: 'Кто и что делал в системе — последние действия.', empty: 'Записей пока нет.', time: 'Время', actor: 'Кто', action: 'Действие', target: 'Объект', detail: 'Детали' },
  en: { title: 'Audit log', subtitle: 'Who did what in the system — most recent actions.', empty: 'No entries yet.', time: 'Time', actor: 'Actor', action: 'Action', target: 'Target', detail: 'Details' },
  hy: { title: 'Աուդիտի մատյան', subtitle: 'Ով ինչ է արել համակարգում — վերջին գործողությունները։', empty: 'Դեռ գրառումներ չկան։', time: 'Ժամ', actor: 'Ով', action: 'Գործողություն', target: 'Օբյեկտ', detail: 'Մանրամասներ' },
} as const;

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${(DICT[locale] ?? DICT.en).title} — Builder Studio`, robots: { index: false, follow: false } as const };
}
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/audit');
  if (!isStaff(me)) redirect('/dashboard');
  // Honour the superadmin's role-access matrix for delegated admins.
  if (!isCapabilityEnabled(me.role, 'audit')) redirect('/dashboard');

  const locale = await getLocale();
  const t = DICT[locale] ?? DICT.en;
  const rows = listAudit(300);

  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />
      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title={t.empty} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.time}</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t.actor}</th>
                <th className="px-4 py-3 font-semibold">{t.action}</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">{t.target}</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">{t.detail}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(a.createdAt).toLocaleString(BCP47[locale])}</td>
                  <td className="hidden max-w-[14rem] truncate px-4 py-3 sm:table-cell">{a.actorEmail}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">{a.action}</span>
                  </td>
                  <td className="hidden max-w-[16rem] truncate px-4 py-3 text-muted-foreground md:table-cell">{a.target || '—'}</td>
                  <td className="hidden max-w-[20rem] truncate px-4 py-3 text-muted-foreground lg:table-cell">{a.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
