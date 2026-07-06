import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { PageHeader } from '@/components/dashboard/ui';
import { OrgOnboarding } from '@/components/dashboard/org-onboarding';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';

export async function generateMetadata() {
  return { title: dashDict(await getLocale()).org.joinMetaTitle };
}
export const dynamic = 'force-dynamic';

export default async function JoinOrgPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/join');
  const t = dashDict(await getLocale());

  return (
    <>
      <PageHeader title={t.nav.organization} description={t.org.joinDesc} />
      <OrgOnboarding />
    </>
  );
}
