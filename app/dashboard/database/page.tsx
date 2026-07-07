import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listTables } from '@/lib/db-admin';
import { PageHeader } from '@/components/dashboard/ui';
import { DbBrowser } from '@/components/dashboard/db-browser';
import { StoragePanel } from '@/components/dashboard/storage-panel';
import { getLocale } from '@/lib/i18n';
import { staffDict } from '@/lib/staff-dict';

export async function generateMetadata() {
  const t = staffDict(await getLocale());
  return { title: `${t.dbMetaTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

export default async function DatabasePage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/database');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const t = staffDict(await getLocale());

  return (
    <>
      <PageHeader title={t.dbTitle} description={t.dbSubtitle} />
      <StoragePanel />
      <DbBrowser tables={listTables()} />
    </>
  );
}
