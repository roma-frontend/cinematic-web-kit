import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { PageHeader } from '@/components/dashboard/ui';
import { TrashManager } from '@/components/dashboard/trash-manager';
import { getLocale } from '@/lib/i18n';

const DICT = {
  ru: { title: 'Корзина', subtitle: 'Удалённые сайты можно восстановить или удалить навсегда.' },
  en: { title: 'Trash', subtitle: 'Deleted sites can be restored or permanently removed.' },
  hy: { title: 'Աղբարկղ', subtitle: 'Ջնջված կայքերը կարելի է վերականգնել կամ ջնջել ընդմիշտ։' },
} as const;

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: `${(DICT[locale] ?? DICT.en).title} — Builder Studio`, robots: { index: false, follow: false } as const };
}
export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/trash');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const t = DICT[(await getLocale())] ?? DICT.en;
  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />
      <TrashManager />
    </>
  );
}
