import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { listAllSites, listAssignableUsers } from '@/lib/admin';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { OrgManager } from '@/components/dashboard/org-manager';
import { OrgRequests } from '@/components/dashboard/org-requests';
import { TenantUsers } from '@/components/dashboard/tenant-users';
import { Building2 } from 'lucide-react';

export const metadata = { title: 'Организации — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/organizations');
  if (!isSuperadmin(me)) redirect('/dashboard');

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
      <PageHeader title="Организации" description="Выберите организацию, чтобы увидеть её данные и назначить администратора." />
      <div className="mb-6"><OrgRequests /></div>
      {sites.length === 0 ? <EmptyState icon={Building2} title="Организаций пока нет" /> : <OrgManager sites={sites} users={users} />}

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Пользователи тенантов</h2>
        <p className="mb-4 text-sm text-muted-foreground">Клиенты сайтов, зарегистрированные на организациях. Здесь можно присвоить пользователю организацию и статус (в т.ч. тем, кто регистрировался до появления организаций).</p>
        <TenantUsers />
      </section>
    </>
  );
}
