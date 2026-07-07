import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listAllSites, listAssignableUsers } from '@/lib/admin';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { OrgManager } from '@/components/dashboard/org-manager';
import { OrgRequests } from '@/components/dashboard/org-requests';
import { TenantUsers } from '@/components/dashboard/tenant-users';
import { Building2 } from 'lucide-react';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';

export async function generateMetadata() {
  const t = dashDict(await getLocale());
  return { title: `${t.orgConsole.metaTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/organizations');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const t = dashDict(await getLocale()).orgConsole;
  const sites = listAllSites().map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    ownerName: s.ownerName,
    ownerEmail: s.ownerEmail,
    published: s.published,
  }));

  const users = listAssignableUsers();

  return (
    <>
      <PageHeader title={t.metaTitle} description={t.subtitle} />
      <div className="mb-6"><OrgRequests /></div>
      {sites.length === 0 ? <EmptyState icon={Building2} title={t.noOrgs} /> : <OrgManager sites={sites} users={users} />}

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">{t.tenantUsersTitle}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t.tenantUsersDesc}</p>
        <TenantUsers />
      </section>
    </>
  );
}
