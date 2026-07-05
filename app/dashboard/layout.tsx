import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserByToken, isSuperadmin, ADMIN_RETURN_COOKIE } from '@/lib/auth';
import { listSitesForUser } from '@/lib/sites';
import { DashboardShell, type Role } from '@/components/dashboard/shell';
import { ImpersonationBanner } from '@/components/dashboard/impersonation-banner';
import { PageHeader } from '@/components/dashboard/ui';
import { OrgOnboarding } from '@/components/dashboard/org-onboarding';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  // If a superadmin return-token is stashed, we're impersonating this user.
  const jar = await cookies();
  const returnToken = jar.get(ADMIN_RETURN_COOKIE)?.value;
  const impersonating = Boolean(returnToken && getUserByToken(returnToken));

  // Access gate: you can't just enter the dashboard — a superadmin must let you
  // in. Until you own an organization (a superadmin approved your create/join
  // request), every dashboard section shows the onboarding instead of content.
  const hasOrg = listSitesForUser(user.id).length > 0;
  const gated = !isSuperadmin(user) && !hasOrg;

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: (user.role as Role) ?? 'customer' }}
      banner={impersonating ? <ImpersonationBanner name={user.name || user.email} /> : null}
      gated={gated}
    >
      {gated ? (
        <>
          <PageHeader title="Добро пожаловать" description="Чтобы пользоваться платформой, создайте организацию или присоединитесь к существующей. Доступ откроется после одобрения суперадмином." />
          <OrgOnboarding />
        </>
      ) : (
        children
      )}
    </DashboardShell>
  );
}
