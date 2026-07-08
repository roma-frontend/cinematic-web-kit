import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserByToken, isSuperadmin, ADMIN_RETURN_COOKIE } from '@/lib/auth';
import { listSitesForUser, statsForUser } from '@/lib/sites';
import { countPendingOrgRequests } from '@/lib/org-requests';
import { countPendingMembersForOwner } from '@/lib/site-membership';
import { disabledCapabilitiesFor } from '@/lib/access';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';
import { DashboardShell, type Role } from '@/components/dashboard/shell';
import { ImpersonationBanner } from '@/components/dashboard/impersonation-banner';
import { PageHeader } from '@/components/dashboard/ui';
import { OrgOnboarding } from '@/components/dashboard/org-onboarding';
import { StudioAssistant } from '@/components/assistant/studio-assistant';
import { llmConfigured } from '@/lib/llm';

// Private area — keep it out of search indexes.
export async function generateMetadata() {
  const t = dashDict(await getLocale());
  return { title: t.dashboard, robots: { index: false, follow: false } as const };
}

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  // If a superadmin return-token is stashed, we're impersonating this user.
  const jar = await cookies();
  const returnToken = jar.get(ADMIN_RETURN_COOKIE)?.value;
  const impersonating = Boolean(returnToken && getUserByToken(returnToken));

  // Forced password change after a superadmin issued a temporary password.
  // Skipped while impersonating so a superadmin never sets the real user's
  // password without their knowledge.
  if (user.mustChangePassword && !impersonating) redirect('/change-password');

  // Access gate: you can't just enter the dashboard — a superadmin must let you
  // in. Until you own an organization (a superadmin approved your create/join
  // request), every dashboard section shows the onboarding instead of content.
  const hasOrg = listSitesForUser(user.id).length > 0;
  const gated = !isSuperadmin(user) && !hasOrg;
  const orgRequests = isSuperadmin(user) ? countPendingOrgRequests() : 0;
  const siteMembers = gated ? 0 : countPendingMembersForOwner(user);
  // Aggregate baseline for the header NotificationBell: form submissions +
  // pending member requests + (superadmin) pending org requests. Live bumps for
  // each of these arrive via the unified SSE stream (/api/notifications/stream).
  const notifications = gated ? 0 : statsForUser(user.id).submissions + siteMembers + orgRequests;
  const disabled = disabledCapabilitiesFor(user.role);
  const dashT = dashDict(await getLocale());

  return (
    <>
      <DashboardShell
        user={{ name: user.name, email: user.email, role: (user.role as Role) ?? 'customer' }}
        banner={impersonating ? <ImpersonationBanner name={user.name || user.email} /> : null}
        gated={gated}
        orgRequests={orgRequests}
        siteMembers={siteMembers}
        notifications={notifications}
        disabled={disabled}
        hideOrgNav={isSuperadmin(user) || hasOrg}
      >
        {gated ? (
          <>
            <PageHeader title={dashT.org.welcomeTitle} description={dashT.org.welcomeDesc} />
            <OrgOnboarding />
          </>
        ) : (
          children
        )}
      </DashboardShell>
      {/* Floating AI guide — only for users with dashboard access and when an
          LLM (e.g. Groq) is configured. Role-gated capabilities inside. */}
      {!gated && llmConfigured() && (
        <StudioAssistant role={(user.role as Role) ?? 'customer'} />
      )}
    </>
  );
}
