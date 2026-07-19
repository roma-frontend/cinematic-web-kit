import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Globe, Rocket, Inbox, Users, Pencil, ExternalLink, CircleDashed, Plus, ArrowRight, Crown, ShieldCheck, Activity, Sparkles, Command, HeartPulse, CheckCircle2 } from 'lucide-react';
import { getCurrentUser, isStaff, isSuperadmin } from '@/lib/auth';
import { listSitesForUser, statsForUser } from '@/lib/sites';
import { countPendingMembersForOwner } from '@/lib/site-membership';
import { platformStats } from '@/lib/admin';
import { disabledCapabilitiesFor } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { PageHeader, StatCard, EmptyState } from '@/components/dashboard/ui';
import { GettingStarted } from '@/components/dashboard/getting-started';
import { OnboardingVideoTour } from '@/components/dashboard/onboarding-video-tour';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';
import { TourLauncher } from '@/components/tour/tour-launcher';
import { WelcomeAutomation } from '@/components/dashboard/welcome-automation';

export async function generateMetadata() {
  const t = dashDict(await getLocale());
  return { title: `${t.overview.metaTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

export default async function DashboardOverview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const welcome = (await searchParams).welcome === '1';
  const d = dashDict(await getLocale());
  const t = d.overview;
  const c = d.command;
  const stats = statsForUser(user.id);
  const pendingMembers = isSuperadmin(user) ? 0 : countPendingMembersForOwner(user);
  const sites = listSitesForUser(user.id).slice(0, 4);
  const staff = isStaff(user);
  // Respect the superadmin's role-access matrix: an admin only sees the platform
  // (staff) metrics whose section they're actually allowed to open. The
  // superadmin is never restricted (disabledCapabilitiesFor → []).
  const disabled = staff ? new Set(disabledCapabilitiesFor(user.role)) : new Set<string>();
  const canUsers = staff && !disabled.has('users');
  const canAllSites = staff && !disabled.has('allSites');
  const platform = canUsers || canAllSites ? platformStats() : null;
  const roleMode = isSuperadmin(user) ? 'superadmin' : user.role === 'admin' ? 'admin' : 'customer';
  const nextAction = !stats.sites
    ? { title: c.createFirstTitle, description: c.createFirstDesc, href: '/dashboard/sites', label: c.createSite, Icon: Sparkles }
    : !stats.published
      ? { title: c.readyTitle, description: c.readyDesc, href: `/studio/builder?site=${sites[0]?.id}`, label: c.openStudio, Icon: Rocket }
      : { title: stats.submissions ? c.signalsWaitingTitle : c.strengthenFlowTitle, description: stats.submissions ? c.openInboxDesc : c.improveCtaDesc, href: '/dashboard/submissions', label: stats.submissions ? c.openInbox : c.viewSubmissions, Icon: Inbox };
  const launchScore = stats.sites === 0 ? 0 : stats.published === 0 ? 55 : stats.submissions === 0 ? 82 : 100;
  const launchLabel = launchScore === 100 ? c.thriving : launchScore >= 80 ? c.almost : launchScore >= 50 ? c.foundation : c.starting;

  return (
    <>
      {welcome && !isSuperadmin(user) && <WelcomeAutomation name={user.name} />}
      <PageHeader
        title={`${t.hi}, ${user.name || t.friend}!`}
        description={t.subtitle}
        action={<Link href="/dashboard/sites"><Button className="gap-1.5"><Plus className="h-4 w-4" /> {d.newSite}</Button></Link>}
      />
      <section className={`relative mb-8 overflow-hidden rounded-3xl border p-6 sm:p-8 ${roleMode === 'superadmin' ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-card to-card' : roleMode === 'admin' ? 'border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card' : 'border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-card to-card'}`}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground"><Command className="h-3.5 w-3.5" /> {roleMode === 'superadmin' ? c.modeSuper : roleMode === 'admin' ? c.modeAdmin : c.modeUser}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{roleMode === 'superadmin' ? c.superTitle : roleMode === 'admin' ? c.adminTitle : c.userTitle.replace('{name}', user.name || t.friend)}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{roleMode === 'superadmin' ? c.superDesc : roleMode === 'admin' ? c.adminDesc : c.userDesc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleMode === 'superadmin' && <Link href="/dashboard/control"><Button className="gap-1.5 bg-amber-500 text-black hover:bg-amber-400"><Crown className="h-4 w-4" /> {c.godMode}</Button></Link>}
            {roleMode === 'admin' && <Link href="/dashboard/members"><Button className="gap-1.5"><ShieldCheck className="h-4 w-4" /> {c.manageTeam}</Button></Link>}
            {roleMode === 'customer' && <Link href={nextAction.href}><Button className="gap-1.5"><nextAction.Icon className="h-4 w-4" /> {nextAction.label}</Button></Link>}
          </div>
        </div>
      </section>

      {roleMode !== 'superadmin' && (
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-primary/25 bg-card/70 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.nextAction}</p>
            <div className="mt-4 flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><nextAction.Icon className="h-6 w-6" /></span><div><h2 className="text-xl font-black tracking-tight">{nextAction.title}</h2><p className="mt-1 text-sm text-muted-foreground">{nextAction.description}</p><Link href={nextAction.href}><Button size="sm" className="mt-4 gap-1.5">{nextAction.label}<ArrowRight className="h-3.5 w-3.5" /></Button></Link></div></div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/50 p-6"><div className="flex items-start justify-between gap-3"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><HeartPulse className="h-4 w-4 text-primary" /> {c.projectPulse}</p><span className="text-right"><strong className="block text-2xl font-black text-primary">{launchScore}%</strong><span className="text-[10px] text-muted-foreground">{launchLabel}</span></span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary via-sky-400 to-green-400 transition-all duration-700" style={{ width: `${launchScore}%` }} /></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div><p className="text-2xl font-black">{stats.sites}</p><p className="text-[11px] text-muted-foreground">сайтов</p></div><div><p className="text-2xl font-black">{stats.published}</p><p className="text-[11px] text-muted-foreground">в эфире</p></div><div><p className="text-2xl font-black">{stats.submissions}</p><p className="text-[11px] text-muted-foreground">сигналов</p></div></div></div>
        </section>
      )}

      {roleMode === 'admin' && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <Link href="/dashboard/members" className="group rounded-3xl border border-border/60 bg-card/50 p-5 transition-all hover:border-primary/40 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{c.teamQueue}</p><p className="mt-3 text-3xl font-black">{pendingMembers}</p><p className="mt-1 text-sm text-muted-foreground">{c.pendingAccess}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${pendingMembers ? 'bg-amber-500/15 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>{pendingMembers ? <Users className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span></div><p className="mt-4 text-sm font-semibold text-primary">{c.openMembers} <ArrowRight className="inline h-3.5 w-3.5" /></p></Link>
          <Link href="/dashboard/submissions" className="group rounded-3xl border border-border/60 bg-card/50 p-5 transition-all hover:border-primary/40 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{c.incoming}</p><p className="mt-3 text-3xl font-black">{stats.submissions}</p><p className="mt-1 text-sm text-muted-foreground">{c.submissionsAcrossSites}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Inbox className="h-5 w-5" /></span></div><p className="mt-4 text-sm font-semibold text-primary">{c.reviewIncoming} <ArrowRight className="inline h-3.5 w-3.5" /></p></Link>
        </section>
      )}

      {roleMode === 'superadmin' && platform && (
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-amber-500/25 bg-card/70 p-6"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400"><Activity className="h-4 w-4" /> {c.platformPulse}</p><h2 className="mt-3 text-2xl font-black">{platform.users} {d.overview.statUsers} · {platform.sites} {d.overview.statAllSites} · {platform.submissions} {c.signals}</h2><p className="mt-2 text-sm text-muted-foreground">{c.superDesc}</p><Link href="/dashboard/control"><Button variant="outline" className="mt-4 gap-1.5"><Activity className="h-4 w-4" /> {c.openPulse}</Button></Link></div>
          <div className="rounded-3xl border border-border/60 bg-card/50 p-6"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-green-500" /> {c.decisionInbox}</p><p className="mt-4 text-lg font-black">{stats.submissions + platform.submissions} {c.signals}</p><p className="mt-1 text-sm text-muted-foreground">{c.superDesc}</p><Link href="/dashboard/control"><Button size="sm" variant="ghost" className="mt-3 gap-1.5">{c.openQueue} <ArrowRight className="h-3.5 w-3.5" /></Button></Link></div>
        </section>
      )}

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

      {sites[0] && (
        <section className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/70 to-card/50 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.continueTitle}</p>
              <h2 className="mt-2 truncate text-xl font-black tracking-tight">{sites[0].name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {sites[0].publishedDoc ? <Rocket className="h-3.5 w-3.5 text-primary" /> : <CircleDashed className="h-3.5 w-3.5" />}
                {sites[0].publishedDoc ? t.continueLive : d.sites.draft}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/studio/builder?site=${sites[0].id}`}>
                <Button className="gap-1.5"><Pencil className="h-4 w-4" /> {t.continueEdit}</Button>
              </Link>
              {sites[0].publishedDoc ? (
                <Link href="/dashboard/submissions"><Button variant="outline" className="gap-1.5"><Inbox className="h-4 w-4" /> {t.continueSubmissions}</Button></Link>
              ) : (
                <Link href={`/dashboard/sites`}><Button variant="outline" className="gap-1.5"><Rocket className="h-4 w-4" /> {t.continuePublish}<ArrowRight className="h-3.5 w-3.5" /></Button></Link>
              )}
            </div>
          </div>
        </section>
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
      <TourLauncher tour="dashboard-overview" autoStart={!welcome} />
    </>
  );
}
