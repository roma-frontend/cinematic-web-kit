import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { PageHeader } from '@/components/dashboard/ui';
import { AccessMatrix } from '@/components/dashboard/access-matrix';
import { getLocale } from '@/lib/i18n';

const DICT = {
  ru: { title: 'Доступ ролей', subtitle: 'Управляйте тем, какие разделы дашборда доступны каждой роли.' },
  en: { title: 'Role access', subtitle: 'Control which dashboard sections each role can access.' },
  hy: { title: 'Դերերի հասանելիություն', subtitle: 'Կառավարեք, թե որ բաժիններն են հասանելի յուրաքանչյուր դերին։' },
} as const;

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${(DICT[locale] ?? DICT.en).title} — Builder Studio`, robots: { index: false, follow: false } as const };
}
export const dynamic = 'force-dynamic';

export default async function AccessPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/access');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const t = DICT[(await getLocale())] ?? DICT.en;
  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />
      <AccessMatrix />
    </>
  );
}
