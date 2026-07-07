import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { recentTrail } from '@/lib/activity';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { getLocale } from '@/lib/i18n';
import { BCP47 } from '@/lib/seo';

const DICT = {
  ru: { title: 'Активность персонала', subtitle: 'Последние переходы сотрудников по разделам дашборда.', empty: 'Пока нет активности.', time: 'Время', who: 'Сотрудник', section: 'Раздел' },
  en: { title: 'Staff activity', subtitle: 'Recent staff navigation across the dashboard.', empty: 'No activity yet.', time: 'Time', who: 'Staff', section: 'Section' },
  hy: { title: 'Անձնակազմի ակտիվություն', subtitle: 'Աշխատակիցների վերջին անցումները բաժինների միջև։', empty: 'Դեռ ակտիվություն չկա։', time: 'Ժամ', who: 'Աշխատակից', section: 'Բաժին' },
} as const;

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${(DICT[locale] ?? DICT.en).title} — Builder Studio`, robots: { index: false, follow: false } as const };
}
export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/activity');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const locale = await getLocale();
  const t = DICT[locale] ?? DICT.en;
  const rows = recentTrail(300);

  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />
      {rows.length === 0 ? (
        <EmptyState icon={Activity} title={t.empty} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.time}</th>
                <th className="px-4 py-3 font-semibold">{t.who}</th>
                <th className="px-4 py-3 font-semibold">{t.section}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(r.at).toLocaleString(BCP47[locale])}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.userName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{r.userEmail}</p>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{r.path}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
