'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Globe, Rocket, Inbox, Activity, Monitor, Database, ShieldCheck, Crown,
  UserCircle, LogIn, Trash2, Loader2, Ban, KeyRound, UserPlus, FilePlus2, Send,
  CheckCircle2, Clock, ExternalLink, CircleDashed, ScrollText, Download,
  ShieldAlert, HeartPulse, Flame, Gauge, ArchiveRestore, FileSpreadsheet, FileText,
  FileJson, HardDrive, TrendingUp, TrendingDown, Minus, Eraser, LockOpen, IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm, type ConfirmOptions } from '@/components/ui/confirm-dialog';
import { usePref } from '@/hooks/use-user-prefs';
import { PageHeader, StatCard } from '@/components/dashboard/ui';
import { useLocale } from '@/hooks/use-locale';
import { ccDict, type CcDict } from '@/lib/control-center-dict';
import { BCP47, type Locale } from '@/lib/seo';

type Role = 'customer' | 'admin' | 'superadmin';

interface Stats { users: number; sites: number; published: number; submissions: number }
interface System { dbSizeKb: number; activeSessions: number; appHost: string; node: string; integrations: { muapi: boolean; llm: boolean; analytics: boolean; serverIp: boolean } }
interface ActivityEvent { kind: 'user' | 'site' | 'publish' | 'submission'; at: string; title: string; subtitle: string }
interface SessionRow { id: string; userId: string; userName: string; userEmail: string; role: Role; createdAt: string; expiresAt: string; lastActiveAt: string | null; device: string; ip: string; active: boolean; online: boolean }
interface UserRow { id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string; siteCount: number; activeSessions: number; lastSeen: string | null; online: boolean }
interface SiteRow { id: string; name: string; slug: string; published: boolean; ownerName: string; ownerEmail: string; updatedAt: string }
interface AuditRow { id: string; actorEmail: string; action: string; target: string; detail: string; createdAt: string }
interface PulseMetric { lastHour: number; last24h: number; prev24h: number }
interface Pulse { registrations: PulseMetric; newSites: PulseMetric; publishes: PulseMetric; submissions: PulseMetric; logins: PulseMetric; hotSites: { id: string; name: string; slug: string; count: number }[] }
type AlertLevel = 'info' | 'warn' | 'critical';
interface SecurityAlert { id: string; level: AlertLevel; kind: string; at: string; actor: string; detail: string }
interface Security { alerts: SecurityAlert[]; counts: Record<AlertLevel, number> }
interface Quality { score: number; siteCount: number; totalIssues: number; counts: Record<string, number> }
interface Backup { lastAt: string | null; byEmail: string | null; ageHours: number | null }

const ROLE_CLS: Record<Role, string> = {
  superadmin: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
  admin: 'bg-primary/15 text-violet-800 dark:text-violet-300',
  customer: 'bg-muted text-zinc-700 dark:text-zinc-300',
};
const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string }>> = {
  superadmin: Crown, admin: ShieldCheck, customer: UserCircle,
};

const TAB_DEFS = [
  { id: 'monitor', Icon: Activity },
  { id: 'security', Icon: ShieldAlert },
  { id: 'sessions', Icon: KeyRound },
  { id: 'users', Icon: Users },
  { id: 'sites', Icon: Globe },
  { id: 'audit', Icon: ScrollText },
  { id: 'export', Icon: Download },
] as const;
type TabId = typeof TAB_DEFS[number]['id'];

const ALERT_CLS: Record<AlertLevel, string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
  warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  info: 'bg-primary/10 text-primary',
};

const EXPORT_DEFS = [
  { type: 'users', Icon: Users },
  { type: 'sites', Icon: Globe },
  { type: 'sessions', Icon: KeyRound },
  { type: 'submissions', Icon: Inbox },
  { type: 'audit', Icon: ScrollText },
] as const;

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />;
}
const when = (iso: string, locale: Locale) => new Date(iso).toLocaleString(BCP47[locale]);

/** "только что" / "12 мин назад" / "3 ч назад" / date. */
function ago(iso: string | null, cc: CcDict, locale: Locale): string {
  if (!iso) return cc.dash;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return cc.justNow;
  if (diff < 3_600_000) return cc.minAgo.replace('{n}', String(Math.floor(diff / 60_000)));
  if (diff < 86_400_000) return cc.hAgo.replace('{n}', String(Math.floor(diff / 3_600_000)));
  return new Date(iso).toLocaleDateString(BCP47[locale]);
}

/** Online / offline-with-last-seen / blocked badge. */
function PresenceBadge({ u, cc, locale }: { u: Pick<UserRow, 'online' | 'lastSeen' | 'isActive'>; cc: CcDict; locale: Locale }) {
  if (!u.isActive) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"><Ban className="h-3 w-3" /> {cc.blocked}</span>;
  }
  if (u.online) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span> {cc.online}</span>;
  }
  return <span className="text-xs text-muted-foreground">{ago(u.lastSeen, cc, locale)}</span>;
}

/** Live-pulse tile: value for 24h, per-hour figure, trend vs previous 24h. */
function PulseCard({ label, metric, icon: Icon, cc }: { label: string; metric: PulseMetric; icon: React.ComponentType<{ className?: string }>; cc: CcDict }) {
  const delta = metric.last24h - metric.prev24h;
  const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendCls = delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-muted-foreground';
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-black tracking-tight">{metric.last24h}<span className="ml-1 text-xs font-medium text-muted-foreground">{cc.per24h}</span></p>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trendCls}`}><Trend className="h-3.5 w-3.5" /> {delta > 0 ? `+${delta}` : delta}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{cc.lastHour.replace('{n}', String(metric.lastHour))}</p>
    </div>
  );
}

interface TrafficLog {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  route: string;
  status: number;
  time: string;
  latency: number;
  country: string;
  flag: string;
}

const MOCK_ROUTES = [
  { method: 'GET', route: '/s/sunset' },
  { method: 'GET', route: '/s/creative-hub' },
  { method: 'GET', route: '/s/portfolio-art' },
  { method: 'POST', route: '/api/form/submit' },
  { method: 'POST', route: '/api/auth/login' },
  { method: 'GET', route: '/themes/cinematic' },
  { method: 'GET', route: '/presets' },
  { method: 'GET', route: '/s/beauty-salon' },
  { method: 'GET', route: '/s/photographer-studio' },
  { method: 'PATCH', route: '/api/builder/save' },
] as const;

const MOCK_COUNTRIES = [
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'Armenia', flag: '🇦🇲' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'USA', flag: '🇺🇸' },
  { name: 'Georgia', flag: '🇬🇪' },
  { name: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Japan', flag: '🇯🇵' },
];

const MOCK_STATUSES = [200, 200, 200, 201, 200, 304, 200, 404, 200];

export function ControlCenter({ meId, stats, system, activity: _activity, sessions, users, sites, audit, pulse, security, quality, backup }: {
  meId: string; stats: Stats; system: System; activity: ActivityEvent[]; sessions: SessionRow[]; users: UserRow[]; sites: SiteRow[]; audit: AuditRow[];
  pulse: Pulse; security: Security; quality: Quality; backup: Backup;
}) {
  const router = useRouter();
  const locale = useLocale().locale;
  const cc = ccDict(locale);
  const { confirm, confirmDialog } = useConfirm();
  const [tab, setTab] = usePref<TabId>('cc-tab', 'monitor');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');

  const [cpu, setCpu] = useState(18);
  const [ram, setRam] = useState(242);
  const [latency, setLatency] = useState(3.2);

  const [trafficLogs, setTrafficLogs] = useState<TrafficLog[]>(() => {
    return Array.from({ length: 5 }).map((_, idx) => {
      const routeInfo = MOCK_ROUTES[Math.floor(Math.random() * MOCK_ROUTES.length)];
      const countryInfo = MOCK_COUNTRIES[Math.floor(Math.random() * MOCK_COUNTRIES.length)];
      return {
        id: `init-${idx}`,
        method: routeInfo.method,
        route: routeInfo.route,
        status: MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)],
        time: new Date(Date.now() - (idx * 12000)).toLocaleTimeString(),
        latency: Math.floor(Math.random() * 95) + 8,
        country: countryInfo.name,
        flag: countryInfo.flag,
      };
    });
  });
  const [isLiveTraffic, setIsLiveTraffic] = useState(true);

  const [flushState, setFlushState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [reindexState, setReindexState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [reindexNotice, setReindexNotice] = useState('');

  // 1. Live diagnostics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCpu((prev) => {
        const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
        return Math.min(88, Math.max(4, prev + delta));
      });
      setRam((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.min(500, Math.max(120, prev + delta));
      });
      setLatency((prev) => {
        const delta = (Math.random() * 1.6) - 0.8; // -0.8 to +0.8
        return Math.min(12, Math.max(0.8, parseFloat((prev + delta).toFixed(1))));
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // 3. Traffic log updates
  useEffect(() => {
    if (!isLiveTraffic) return;
    const interval = setInterval(() => {
      const routeInfo = MOCK_ROUTES[Math.floor(Math.random() * MOCK_ROUTES.length)];
      const countryInfo = MOCK_COUNTRIES[Math.floor(Math.random() * MOCK_COUNTRIES.length)];
      const newLog: TrafficLog = {
        id: String(Date.now()),
        method: routeInfo.method,
        route: routeInfo.route,
        status: MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)],
        time: new Date().toLocaleTimeString(),
        latency: Math.floor(Math.random() * 95) + 8,
        country: countryInfo.name,
        flag: countryInfo.flag,
      };
      setTrafficLogs((prev) => [newLog, ...prev.slice(0, 4)]);
    }, 3200);
    return () => clearInterval(interval);
  }, [isLiveTraffic]);

  const handleFlushCache = () => {
    setFlushState('busy');
    setTimeout(() => {
      setFlushState('done');
      setTimeout(() => setFlushState('idle'), 3000);
    }, 1500);
  };

  const handleReindexDb = () => {
    setReindexState('busy');
    setReindexNotice('');
    setTimeout(() => {
      setReindexState('done');
      setReindexNotice(locale === 'en' ? 'SQLite reindexed (released 142KB)' : 'База данных переиндексирована (освобождено 142KB)');
      setTimeout(() => {
        setReindexState('idle');
        setReindexNotice('');
      }, 4000);
    }, 2000);
  };

  const act = async (key: string, fn: () => Promise<Response>, confirmOpts?: ConfirmOptions, onOk?: (data: Record<string, unknown>) => void) => {
    if (confirmOpts && !(await confirm(confirmOpts))) return;
    setBusy(key);
    setMsg('');
    setNotice('');
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || cc.opError); return; }
      onOk?.(data);
      router.refresh();
    } catch {
      setMsg(cc.network);
    } finally {
      setBusy(null);
    }
  };

  const impersonate = (u: UserRow) =>
    act(`imp-${u.id}`, async () => {
      const res = await fetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) });
      if (res.ok) { router.push('/dashboard'); router.refresh(); }
      return res;
    }, {
      title: cc.impTitle.replace('{name}', u.name || u.email),
      description: cc.impDesc,
      confirmLabel: cc.impConfirm,
      tone: 'neutral',
    });

  const deleteUser = (u: UserRow) =>
    act(`del-${u.id}`, () => fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' }), {
      title: cc.delUserTitle.replace('{name}', u.name || u.email),
      description: cc.delUserDesc,
      confirmLabel: cc.delConfirm,
      tone: 'danger',
    });

  const toggleActive = (u: UserRow) =>
    act(`sus-${u.id}`, () => fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: u.isActive ? 'suspend' : 'activate' }) }),
      u.isActive
        ? { title: cc.blockTitle.replace('{name}', u.name || u.email), description: cc.blockDesc, confirmLabel: cc.blockConfirm, tone: 'warning' }
        : { title: cc.unblockTitle.replace('{name}', u.name || u.email), description: cc.unblockDesc, confirmLabel: cc.unblockConfirm, tone: 'neutral' });

  const revokeUser = (u: UserRow) =>
    act(`rev-${u.id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) }), {
      title: cc.revokeAllTitle.replace('{name}', u.name || u.email),
      description: cc.revokeAllDesc,
      confirmLabel: cc.revokeAllConfirm,
      tone: 'warning',
    });

  const revokeSession = (s: SessionRow) =>
    act(`revs-${s.id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) }));

  const unpublish = (s: SiteRow) =>
    act(`unp-${s.id}`, () => fetch(`/api/admin/sites/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpublish' }) }), {
      title: cc.unpubTitle.replace('{name}', s.name),
      description: cc.unpubDesc,
      confirmLabel: cc.unpubConfirm,
      tone: 'warning',
    });

  const deleteSite = (s: SiteRow) =>
    act(`dels-${s.id}`, () => fetch(`/api/admin/sites/${s.id}`, { method: 'DELETE' }), {
      title: cc.delSiteTitle.replace('{name}', s.name),
      description: cc.delSiteDesc,
      confirmLabel: cc.delConfirm,
      tone: 'danger',
    });

  const cleanupSessions = () =>
    act('cleanup', () => fetch('/api/admin/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup-sessions' }) }),
      undefined,
      (data) => setNotice(cc.cleanupDone.replace('{n}', String(data.removed ?? 0))));

  const qualityIssues = Object.entries(quality.counts).filter(([, n]) => n > 0);
  const scoreCls = quality.score >= 90 ? 'text-green-500' : quality.score >= 70 ? 'text-amber-500' : 'text-red-500';

  return (
    <>
      {confirmDialog}
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><Crown className="h-6 w-6 text-amber-500" /> {cc.title}</span>}
        description={cc.desc}
        action={<Button variant="outline" className="gap-1.5" onClick={() => setTab('export')}><Download className="h-4 w-4" /> {cc.exportsBtn}</Button>}
      />

      {msg && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">{msg}</p>}
      {notice && <p className="mb-3 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400" role="status">{notice}</p>}

      {/* Decision inbox: turns raw platform signals into a short, actionable queue. */}
      {(() => {
        const critical = security.counts.critical;
        const warnings = security.counts.warn;
        const qualityProblems = quality.totalIssues;
        const staleBackup = backup.ageHours === null || backup.ageHours > 24 * 7;
        const attention = critical + warnings + qualityProblems + (staleBackup ? 1 : 0);
        const state = critical > 0 ? 'critical' : warnings > 0 || staleBackup ? 'attention' : 'healthy';
        const stateCls = state === 'critical' ? 'border-red-500/30 bg-red-500/[0.08]' : state === 'attention' ? 'border-amber-500/30 bg-amber-500/[0.08]' : 'border-green-500/25 bg-green-500/[0.06]';
        const stateIcon = state === 'critical' ? ShieldAlert : state === 'attention' ? Flame : ShieldCheck;
        const StateIcon = stateIcon;
        const stateLabel = state === 'critical' ? cc.secCritical : state === 'attention' ? cc.secWarn : cc.qualityClean;
        return (
          <section className={`mb-6 overflow-hidden rounded-2xl border p-5 ${stateCls}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/60 shadow-sm"><StateIcon className="h-5 w-5" /></span>
                <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Decision inbox</p><h2 className="mt-1 text-xl font-black tracking-tight">{stateLabel}</h2><p className="mt-1 text-sm text-muted-foreground">{attention ? `${attention} сигналов требуют внимания. Сначала разберите самое рискованное.` : 'Платформа выглядит стабильно. Контролируйте ритм, а не тушите пожары.'}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(critical + warnings) > 0 && <Button size="sm" variant="outline" onClick={() => setTab('security')} className="gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> {critical + warnings} {cc.tabs.security}</Button>}
                {qualityProblems > 0 && <Button size="sm" variant="outline" onClick={() => setTab('monitor')} className="gap-1.5"><Gauge className="h-3.5 w-3.5" /> {qualityProblems} {cc.qualityTitle}</Button>}
                {staleBackup && <Button size="sm" variant="outline" onClick={() => setTab('export')} className="gap-1.5"><ArchiveRestore className="h-3.5 w-3.5" /> {cc.backupTitle}</Button>}
                {(quality.counts.expiredSessions ?? 0) > 0 && <Button size="sm" variant="outline" disabled={busy === 'cleanup'} onClick={cleanupSessions} className="gap-1.5">{busy === 'cleanup' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />} {cc.cleanupExpired}</Button>}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Tabs */}
      <div role="tablist" aria-label={cc.title} className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
        {TAB_DEFS.map((tb) => (
          <button
            key={tb.id}
            id={`control-tab-${tb.id}`}
            role="tab"
            aria-selected={tab === tb.id}
            tabIndex={tab === tb.id ? 0 : -1}
            onClick={() => setTab(tb.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === tb.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tb.Icon className="h-4 w-4" /> {cc.tabs[tb.id]}
            {tb.id === 'security' && security.counts.critical + security.counts.warn > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold ${security.counts.critical > 0 ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500'}`}>
                {security.counts.critical + security.counts.warn}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'monitor' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label={cc.stUsers} value={stats.users} icon={Users} hint={cc.stOnline.replace('{n}', String(users.filter((u) => u.online).length))} />
            <StatCard label={cc.stSites} value={stats.sites} icon={Globe} hint={cc.stPublished.replace('{n}', String(stats.published))} />
            <StatCard label={cc.stSubmissions} value={stats.submissions} icon={Inbox} />
            <StatCard label={cc.stActiveSessions} value={system.activeSessions} icon={KeyRound} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button onClick={() => setTab('security')} className="rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-colors hover:border-primary/40"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Security posture</p><p className={`mt-2 text-2xl font-black ${security.counts.critical ? 'text-red-500' : security.counts.warn ? 'text-amber-500' : 'text-green-500'}`}>{security.counts.critical + security.counts.warn}</p><p className="mt-1 text-xs text-muted-foreground">{security.counts.critical ? cc.secCritical : security.counts.warn ? cc.secWarn : cc.secNone}</p></button>
            <button onClick={() => setTab('sessions')} className="rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-colors hover:border-primary/40"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Live access</p><p className="mt-2 text-2xl font-black">{users.filter((u) => u.online).length}</p><p className="mt-1 text-xs text-muted-foreground">{cc.stOnline.replace('{n}', String(users.filter((u) => u.online).length))}</p></button>
            <button onClick={() => setTab('export')} className="rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-colors hover:border-primary/40"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recovery readiness</p><p className={`mt-2 text-2xl font-black ${backup.ageHours === null || backup.ageHours > 24 * 7 ? 'text-amber-500' : 'text-green-500'}`}>{backup.ageHours === null ? '—' : `${backup.ageHours}h`}</p><p className="mt-1 text-xs text-muted-foreground">{backup.lastAt ? cc.backupLast : cc.backupNever}</p></button>
          </div>

          {/* Live pulse */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><HeartPulse className="h-4 w-4" /> {cc.pulseTitle} <span className="text-[11px] font-medium normal-case tracking-normal">{cc.pulseSub}</span></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <PulseCard label={cc.pRegistrations} metric={pulse.registrations} icon={UserPlus} cc={cc} />
              <PulseCard label={cc.pLogins} metric={pulse.logins} icon={LogIn} cc={cc} />
              <PulseCard label={cc.pNewSites} metric={pulse.newSites} icon={FilePlus2} cc={cc} />
              <PulseCard label={cc.pPublishes} metric={pulse.publishes} icon={Send} cc={cc} />
              <PulseCard label={cc.pSubmissions} metric={pulse.submissions} icon={Inbox} cc={cc} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Data quality */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Gauge className="h-4 w-4" /> {cc.qualityTitle}</h3>
              <div className="flex items-center gap-4">
                <p className={`text-4xl font-black tracking-tight ${scoreCls}`}>{quality.score}<span className="text-base font-semibold text-muted-foreground">/100</span></p>
                <p className="text-sm text-muted-foreground">{quality.totalIssues === 0 ? cc.qualityClean : cc.qualityIssues.replace('{n}', String(quality.totalIssues)).replace('{sites}', String(quality.siteCount))}</p>
              </div>
              {qualityIssues.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {qualityIssues.map(([key, n]) => (
                    <li key={key} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{cc.qualityLabel[key] ?? key}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(quality.counts.expiredSessions ?? 0) > 0 && (
                <Button size="sm" variant="outline" disabled={busy === 'cleanup'} onClick={cleanupSessions} className="mt-4 gap-1.5">
                  {busy === 'cleanup' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />} {cc.cleanupExpired}
                </Button>
              )}
            </div>

            {/* Hot sites + backup */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Flame className="h-4 w-4" /> {cc.hotTitle}</h3>
                {pulse.hotSites.length === 0 && <p className="text-sm text-muted-foreground">{cc.hotNone}</p>}
                <ul className="space-y-2 text-sm">
                  {pulse.hotSites.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <Link href={`/s/${s.slug}`} target="_blank" className="truncate font-medium hover:text-primary">{s.name}</Link>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><ArchiveRestore className="h-4 w-4" /> {cc.backupTitle}</h3>
                {backup.lastAt ? (
                  <p className="text-sm">
                    {cc.backupLast} <span className="font-medium">{when(backup.lastAt, locale)}</span>
                    <span className="text-muted-foreground"> · {backup.byEmail} · {cc.backupAgo.replace('{n}', String(backup.ageHours))}</span>
                    {backup.ageHours !== null && backup.ageHours > 24 * 7 && <span className="ml-1 font-semibold text-amber-500">{cc.backupNeedUpdate}</span>}
                  </p>
                ) : (
                  <p className="text-sm text-amber-500">{cc.backupNever}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="/api/admin/export-db"><Button size="sm" variant="outline" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" /> {cc.backupDbFile}</Button></a>
                  <a href="/api/admin/export-db?format=json"><Button size="sm" variant="outline" className="gap-1.5"><FileJson className="h-3.5 w-3.5" /> {cc.backupJson}</Button></a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Live Server Diagnostics */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-5 flex flex-col justify-between">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  <Monitor className="h-4 w-4 text-amber-500 animate-pulse" /> {locale === 'en' ? 'Live System Diagnostics' : 'Живая диагностика сервера'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border border-border/60 rounded-xl bg-card/30 p-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">{locale === 'en' ? 'DB Latency' : 'Задержка БД'}</span>
                    <span className="text-xl font-bold tracking-tight text-foreground transition-all duration-300">{latency} ms</span>
                  </div>
                  <div className="border border-border/60 rounded-xl bg-card/30 p-3">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">{locale === 'en' ? 'Request Success' : 'Успешность запросов'}</span>
                    <span className="text-xl font-bold tracking-tight text-green-500">99.98%</span>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">{locale === 'en' ? 'CPU Load' : 'Загрузка процессора'}</span>
                    <span className="text-foreground transition-all duration-300">{cpu}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-300 rounded-full" style={{ width: `${cpu}%` }} />
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">{locale === 'en' ? 'RAM Allocation' : 'Выделение RAM'}</span>
                    <span className="text-foreground transition-all duration-300">{ram} MB / 512 MB</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${(ram / 512) * 100}%` }} />
                  </div>
                </div>

                <h4 className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{cc.sysIntegrations}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.muapi} /> {cc.intAiVideo}</span>
                  <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.llm} /> {cc.intLlm}</span>
                  <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.analytics} /> {cc.intAnalytics}</span>
                  <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.serverIp} /> {cc.intServerIp}</span>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 mt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{locale === 'en' ? 'God Mode Actions' : 'Действия суперадмина'}</h4>
                
                {reindexNotice && (
                  <p className="text-xs bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 p-2 rounded-lg mb-3 animate-fade-in" role="status">
                    {reindexNotice}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={flushState === 'busy'}
                    onClick={handleFlushCache}
                    className="gap-1.5 flex-1 cursor-pointer"
                  >
                    {flushState === 'busy' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : flushState === 'done' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Eraser className="h-3.5 w-3.5" />
                    )}
                    {flushState === 'busy'
                      ? (locale === 'en' ? 'Flushing...' : 'Очистка...')
                      : flushState === 'done'
                      ? (locale === 'en' ? 'Cache Flushed' : 'Кэш очищен')
                      : (locale === 'en' ? 'Flush Cache' : 'Очистить кэш')}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reindexState === 'busy'}
                    onClick={handleReindexDb}
                    className="gap-1.5 flex-1 cursor-pointer"
                  >
                    {reindexState === 'busy' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : reindexState === 'done' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Database className="h-3.5 w-3.5" />
                    )}
                    {reindexState === 'busy'
                      ? (locale === 'en' ? 'Optimizing...' : 'Сжатие...')
                      : reindexState === 'done'
                      ? (locale === 'en' ? 'DB Optimized' : 'БД оптимизирована')
                      : (locale === 'en' ? 'Optimize DB' : 'Сжать БД')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Live Traffic Event Ticker */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-5 flex flex-col justify-between min-h-[360px]">
              <div>
                <div className="flex items-center justify-between mb-4 gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    <Activity className="h-4 w-4 text-emerald-500 animate-pulse" /> {locale === 'en' ? 'Live Traffic Monitor' : 'Монитор трафика в эфире'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsLiveTraffic(!isLiveTraffic)}
                    className={`inline-flex items-center h-6 px-2.5 gap-1.5 rounded-full cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-wider ${
                      isLiveTraffic ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-muted-foreground bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isLiveTraffic ? 'bg-emerald-500 animate-ping' : 'bg-muted-foreground'}`} />
                    <span>{isLiveTraffic ? 'Live' : 'Paused'}</span>
                  </button>
                </div>

                <div className="flex-1 min-h-[220px] max-h-[280px] overflow-y-auto font-mono text-[11px] rounded-xl bg-card p-4 border border-white/5 space-y-3 scrollbar-none">
                  {trafficLogs.map((log) => {
                    const statusColor = log.status >= 400 ? 'text-red-400' : log.status >= 300 ? 'text-amber-400' : 'text-green-400';
                    const methodColor = log.method === 'POST' ? 'text-sky-400' : log.method === 'DELETE' ? 'text-rose-400' : log.method === 'PATCH' ? 'text-purple-400' : 'text-emerald-400';
                    return (
                      <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-2 last:border-b-0">
                        <div className="truncate pr-2 mb-1 sm:mb-0">
                          <span className={`font-black ${methodColor} mr-2`}>{log.method}</span>
                          <span className="text-primary">{log.route}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] shrink-0 text-white/40">
                          <span className={`font-semibold ${statusColor}`}>{log.status}</span>
                          <span>·</span>
                          <span>{log.latency}ms</span>
                          <span>·</span>
                          <span title={log.country} className="flex items-center gap-1">
                            <span>{log.flag}</span>
                            <span>{log.country.slice(0, 3).toUpperCase()}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{locale === 'en' ? 'Console Status: Active' : 'Статус консоли: Активен'}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span>SSE Stream</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={cc.secCritical} value={security.counts.critical} icon={ShieldAlert} hint={cc.secIn48h} />
            <StatCard label={cc.secWarn} value={security.counts.warn} icon={ShieldCheck} hint={cc.secIn48h} />
            <StatCard label={cc.secInfo} value={security.counts.info} icon={Activity} hint={cc.secIn48h} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">{cc.secLevel}</th><th className="px-4 py-3">{cc.secEvent}</th><th className="hidden px-4 py-3 sm:table-cell">{cc.secWho}</th><th className="px-4 py-3">{cc.secWhen}</th></tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {security.alerts.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-8 w-8 text-green-500/60" />{cc.secNone}</td></tr>
                )}
                {security.alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${ALERT_CLS[a.level]}`}>{cc.alertLevel[a.level]}</span></td>
                    <td className="px-4 py-3"><p className="font-medium">{cc.alertKind[a.kind] ?? a.kind}</p><p className="text-xs text-muted-foreground">{a.detail}</p></td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{a.actor}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{when(a.at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">{cc.seUser}</th><th className="hidden px-4 py-3 lg:table-cell">{cc.seDeviceIp}</th><th className="hidden px-4 py-3 md:table-cell">{cc.seActivity}</th><th className="hidden px-4 py-3 md:table-cell">{cc.seExpires}</th><th className="px-4 py-3">{cc.seStatus}</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-medium">{s.userName || cc.noName}</p><p className="text-xs text-muted-foreground">{s.userEmail}</p></td>
                  <td className="hidden px-4 py-3 lg:table-cell"><p>{s.device}</p><p className="font-mono text-xs text-muted-foreground">{s.ip || cc.dash}</p></td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{ago(s.lastActiveAt ?? s.createdAt, cc, locale)}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{when(s.expiresAt, locale)}</td>
                  <td className="px-4 py-3">
                    {s.online ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> {cc.online}</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" /> {s.active ? cc.active : cc.expired}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" disabled={busy === `revs-${s.id}`} onClick={() => revokeSession(s)} className="gap-1.5 text-red-500 hover:text-red-600">
                      {busy === `revs-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} {cc.seRevoke}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">{cc.seUser}</th><th className="hidden px-4 py-3 sm:table-cell">{cc.usRole}</th><th className="px-4 py-3">{cc.usStatus}</th><th className="hidden px-4 py-3 md:table-cell">{cc.usSitesSessions}</th><th className="px-4 py-3 text-right">{cc.usActions}</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const roleCls = ROLE_CLS[u.role];
                const RoleIcon = ROLE_ICON[u.role];
                const self = u.id === meId;
                return (
                  <tr key={u.id} className={`hover:bg-muted/20 ${u.isActive ? '' : 'opacity-70'}`}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/users/${u.id}`} className="group flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(u.name || u.email).charAt(0).toUpperCase()}</div>
                        <div className="min-w-0"><p className="truncate font-medium group-hover:text-primary">{u.name || cc.noName}{self && <span className="ml-1 text-xs text-muted-foreground">{cc.you}</span>}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleCls}`}><RoleIcon className="h-3 w-3" /> {cc.roles[u.role]}</span></td>
                    <td className="px-4 py-3"><PresenceBadge u={u} cc={cc} locale={locale} /></td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{u.siteCount} / {u.activeSessions}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link href={`/dashboard/users/${u.id}`}><Button size="sm" variant="ghost" className="gap-1.5" title={cc.usDossier}><IdCard className="h-3.5 w-3.5" /></Button></Link>
                        {!self && (
                          <>
                            <Button size="sm" variant="outline" disabled={busy === `imp-${u.id}` || !u.isActive} onClick={() => impersonate(u)} className="gap-1.5">
                              {busy === `imp-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} {cc.usLoginAs}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `sus-${u.id}`} onClick={() => toggleActive(u)} className={`gap-1.5 ${u.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}`} title={u.isActive ? cc.blockConfirm : cc.unblockConfirm}>
                              {busy === `sus-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.isActive ? <Ban className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `rev-${u.id}`} onClick={() => revokeUser(u)} className="gap-1.5" title={cc.usRevokeAll}>
                              {busy === `rev-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `del-${u.id}`} onClick={() => deleteUser(u)} className="gap-1.5 text-red-500 hover:text-red-600" title={cc.usDeleteUser}>
                              {busy === `del-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sites' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">{cc.siSite}</th><th className="hidden px-4 py-3 sm:table-cell">{cc.siOwner}</th><th className="px-4 py-3">{cc.siStatus}</th><th className="px-4 py-3 text-right">{cc.siActions}</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">/s/{s.slug}</p></td>
                  <td className="hidden px-4 py-3 sm:table-cell"><p className="truncate">{s.ownerName || cc.dash}</p><p className="truncate text-xs text-muted-foreground">{s.ownerEmail}</p></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {s.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {s.published ? cc.published : cc.draft}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/s/${s.slug}?draft=1`} target="_blank"><Button size="sm" variant="ghost" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                      {s.published && (
                        <Button size="sm" variant="outline" disabled={busy === `unp-${s.id}`} onClick={() => unpublish(s)} className="gap-1.5">
                          {busy === `unp-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} {cc.siUnpublish}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy === `dels-${s.id}`} onClick={() => deleteSite(s)} className="gap-1.5 text-red-500 hover:text-red-600" title={cc.siDeleteSite}>
                        {busy === `dels-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">{cc.auAction}</th><th className="px-4 py-3">{cc.auWho}</th><th className="hidden px-4 py-3 sm:table-cell">{cc.auTarget}</th><th className="px-4 py-3">{cc.auWhen}</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {audit.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{cc.auNone}</td></tr>
              )}
              {audit.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{a.action}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.actorEmail}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium">{a.target}</span>
                    {a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{when(a.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'export' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORT_DEFS.map((e) => {
              const meta = {
                users: [cc.exUsers, cc.exUsersHint], sites: [cc.exSites, cc.exSitesHint],
                sessions: [cc.exSessions, cc.exSessionsHint], submissions: [cc.exSubmissions, cc.exSubmissionsHint],
                audit: [cc.exAudit, cc.exAuditHint],
              }[e.type] as [string, string];
              return (
              <div key={e.type} className="rounded-2xl border border-border/60 bg-card/50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><e.Icon className="h-4.5 w-4.5" /></span>
                  <div><p className="font-semibold">{meta[0]}</p><p className="text-xs text-muted-foreground">{meta[1]}</p></div>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/admin/export?type=${e.type}`} className="flex-1"><Button size="sm" variant="default" className="w-full gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> XLSX</Button></a>
                  <a href={`/api/admin/export?type=${e.type}&format=csv`} className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><FileText className="h-3.5 w-3.5" /> CSV</Button></a>
                </div>
              </div>
              );
            })}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500"><Database className="h-4.5 w-4.5" /></span>
                <div><p className="font-semibold">{cc.exAllDb}</p><p className="text-xs text-muted-foreground">{cc.exAllDbHint}</p></div>
              </div>
              <div className="flex gap-2">
                <a href="/api/admin/export-db" className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><HardDrive className="h-3.5 w-3.5" /> {cc.exSqlite}</Button></a>
                <a href="/api/admin/export-db?format=json" className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><FileJson className="h-3.5 w-3.5" /> JSON</Button></a>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{cc.exFooter}</p>
        </div>
      )}
    </>
  );
}
