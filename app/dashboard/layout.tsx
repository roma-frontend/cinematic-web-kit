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
import { CommandPalette } from '@/components/command-palette';
import { ImpersonationBanner } from '@/components/dashboard/impersonation-banner';
import { PageHeader } from '@/components/dashboard/ui';
import { OrgOnboarding } from '@/components/dashboard/org-onboarding';
import { StudioAssistant } from '@/components/assistant/studio-assistant';
import { PlatformThemeStyle } from '@/components/platform-theme-style';
import { ThemeStyle } from '@/components/theme-style';
import { getTheme } from '@/lib/themes';
import { llmConfigured } from '@/lib/llm';
import { getUserEntitlements } from '@/lib/billing/entitlements';
import { getActiveSubscription } from '@/lib/billing/subscriptions';
import { FreePlanBanner } from '@/components/dashboard/free-plan-banner';
import { TrialBanner } from '@/components/dashboard/trial-banner';

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
  const ownedSites = listSitesForUser(user.id);
  const hasOrg = ownedSites.length > 0;
  // Org-wide admin-panel theme: a non-superadmin owner can re-skin their whole
  // dashboard (and their members' account area) from the Studio. '' / 'auto' =
  // inherit the platform theme. Superadmin always sees the platform theme.
  const orgDashRaw = isSuperadmin(user) ? '' : (ownedSites[0]?.dashboardTheme ?? '');
  const orgDashTheme = orgDashRaw && orgDashRaw !== 'auto' ? orgDashRaw : '';
  const gated = !isSuperadmin(user) && !hasOrg;
  // Value-first: an org owner with no active subscription is NOT locked out —
  // they can build unlimited sites for free. Publishing, custom domains and
  // extra AI video are the paid moments (enforced per-action). We only surface a
  // slim upgrade banner. Superadmin is exempt; onboarding (gated) takes priority.
  const activeSub = isSuperadmin(user) ? true : getActiveSubscription(user.id) != null;
  const freePlan = !isSuperadmin(user) && hasOrg && !activeSub;
  // Complimentary onboarding trial: surface an explicit, honest banner so a
  // brand-new owner understands Pro is on for free (not a purchased plan).
  const sub = isSuperadmin(user) ? null : getActiveSubscription(user.id);
  const trialEndsOn = sub && sub.status === 'trialing' && sub.currentPeriodEnd
    ? sub.currentPeriodEnd.toISOString().slice(0, 10)
    : null;
  const orgRequests = isSuperadmin(user) ? countPendingOrgRequests() : 0;
  const siteMembers = gated ? 0 : countPendingMembersForOwner(user);
  // Aggregate baseline for the header NotificationBell: form submissions +
  // pending member requests + (superadmin) pending org requests. Live bumps for
  // each of these arrive via the unified SSE stream (/api/notifications/stream).
  const notifications = gated ? 0 : statsForUser(user.id).submissions + siteMembers + orgRequests;
  const disabled = disabledCapabilitiesFor(user.role);
  const dashT = dashDict(await getLocale());

  // Telegram sign-ins have a synthetic tg_<id>@telegram.local email — show the
  // @username instead (or nothing) rather than that long placeholder.
  const isTgEmail = /@telegram\.local$/i.test(user.email);
  const handle = user.telegramUsername
    ? `@${user.telegramUsername}`
    : isTgEmail ? '' : user.email;

  return (
    <>
      {orgDashTheme ? <ThemeStyle theme={getTheme(orgDashTheme)} /> : <PlatformThemeStyle />}
      <DashboardShell
        user={{ name: user.name, email: user.email, role: (user.role as Role) ?? 'customer', handle }}
        banner={impersonating ? <ImpersonationBanner name={user.name || user.email} /> : freePlan ? <FreePlanBanner /> : trialEndsOn ? <TrialBanner endsOn={trialEndsOn} /> : null}
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
      {/* Floating AI guide — only for users with dashboard access, an assistant
          entitlement (Pro/Studio) and when an LLM (e.g. Groq) is configured.
          Role- and plan-gated capabilities inside. */}
      {!gated && llmConfigured() && getUserEntitlements(user).has('assistant.use') && (
        <StudioAssistant role={(user.role as Role) ?? 'customer'} />
      )}
      {/* ⌘K / Ctrl+K command palette — keyboard-only inside the dashboard (the
          shell has its own chrome, so no visual trigger is added here). */}
      <CommandPalette
        user={{ name: user.name, email: user.email, role: (user.role as Role) ?? 'customer' }}
        showTrigger={false}
      />
    </>
  );
}
