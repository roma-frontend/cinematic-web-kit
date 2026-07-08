import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { PageHeader } from '@/components/dashboard/ui';
import { TelegramSettings } from '@/components/dashboard/telegram-settings';
import { getLocale } from '@/lib/i18n';
import { telegramDict } from '@/lib/telegram-dict';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: telegramDict(await getLocale()).metaTitle };
}

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/notifications');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const t = telegramDict(await getLocale());
  return (
    <div>
      <PageHeader title={t.pageTitle} description={t.pageDesc} />
      <TelegramSettings />
    </div>
  );
}
