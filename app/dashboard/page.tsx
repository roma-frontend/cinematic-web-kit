import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Globe, Rocket, Inbox, Users, Pencil, ExternalLink, CircleDashed, Plus } from 'lucide-react';
import { getCurrentUser, isStaff, isSuperadmin } from '@/lib/auth';
import { listSitesForUser, statsForUser } from '@/lib/sites';
import { platformStats } from '@/lib/admin';
import { disabledCapabilitiesFor } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard, EmptyState } from '@/components/dashboard/ui';
import { GettingStarted } from '@/components/dashboard/getting-started';
import { OnboardingVideoTour } from '@/components/dashboard/onboarding-video-tour';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';
import { TourLauncher } from '@/components/tour/tour-launcher';

export async function generateMetadata() {
  const t = dashDict(await getLocale());
  return { title: `${t.overview.metaTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const d = dashDict(await getLocale());
  const t = d.overview;
  const stats = statsForUser(user.id);
  const sites = listSitesForUser(user.id).slice(0, 4);
  const staff = isStaff(user);
  // Respect the superadmin's role-access matrix: an admin only sees the platform
  // (staff) metrics whose section they're actually allowed to open. The
  // superadmin is never restricted (disabledCapabilitiesFor → []).
  const disabled = staff ? new Set(disabledCapabilitiesFor(user.role)) : new Set<string>();
  const canUsers = staff && !disabled.has('users');
  const canAllSites = staff && !disabled.has('allSites');
  const platform = canUsers || canAllSites ? platformStats() : null;

  return (
    <>
      <PageHeader
        title={`${t.hi}, ${user.name || t.friend}!`}
        description={t.subtitle}
        action={<Link href="/dashboard/sites"><Button className="gap-1.5"><Plus className="h-4 w-4" /> {d.newSite}</Button></Link>}
      />

      {!isSuperadmin(user) && (
        <>
          <OnboardingVideoTour />
          <GettingStarted
            hasSite={stats.sites > 0}
            hasPublished={stats.published > 0}
            hasLeads={stats.submissions > 0}
            primarySiteId={sites[0]?.id ?? null}
          />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.statSites} value={stats.sites} icon={Globe} href="/dashboard/sites" />
        <StatCard label={t.statPublished} value={stats.published} icon={Rocket} hint={`${t.ofN} ${stats.sites}`} />
        <StatCard label={t.statSubmissions} value={stats.submissions} icon={Inbox} href="/dashboard/submissions" />
      </div>

      {platform && (
        <>
          <h2 className="mb-3 mt-10 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <Users className="h-4 w-4 text-amber-500" /> {t.platformStaff}
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {canUsers && <StatCard label={t.statUsers} value={platform.users} icon={Users} href="/dashboard/users" />}
            {canAllSites && <StatCard label={t.statAllSites} value={platform.sites} icon={Globe} href="/dashboard/all-sites" />}
            {canAllSites && <StatCard label={t.statPublished} value={platform.published} icon={Rocket} />}
            {canAllSites && <StatCard label={t.statSubmissions} value={platform.submissions} icon={Inbox} />}
          </div>
        </>
      )}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">{t.recentSites}</h2>
      {sites.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={d.sites.emptyTitle}
          description={d.sites.emptyDesc}
          action={<Link href="/dashboard/sites"><Button className="mt-1 gap-1.5"><Plus className="h-4 w-4" /> {d.sites.create}</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <div key={site.id} className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold tracking-tight">{site.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">/s/{site.slug}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${site.publishedDoc ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {site.publishedDoc ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                  {site.publishedDoc ? d.sites.published : d.sites.draft}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link href={`/studio/builder?site=${site.id}`}><Button size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> {d.sites.edit}</Button></Link>
                <Link href={`/s/${site.slug}?draft=1`} target="_blank"><Button size="sm" variant="outline" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> {d.sites.open}</Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <TourLauncher tour="dashboard-overview" />
    </>
  );
}
