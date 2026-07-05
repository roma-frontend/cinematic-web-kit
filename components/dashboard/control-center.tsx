'use client';

import { useState } from 'react';
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
import { PageHeader, StatCard } from '@/components/dashboard/ui';

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

const ROLE_META: Record<Role, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  superadmin: { label: 'Суперадмин', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', Icon: Crown },
  admin: { label: 'Админ', cls: 'bg-primary/15 text-primary', Icon: ShieldCheck },
  customer: { label: 'Клиент', cls: 'bg-muted text-muted-foreground', Icon: UserCircle },
};
const ACT_ICON = { user: UserPlus, site: FilePlus2, publish: Send, submission: Inbox };
const TABS = [
  { id: 'monitor', label: 'Мониторинг', Icon: Activity },
  { id: 'security', label: 'Безопасность', Icon: ShieldAlert },
  { id: 'sessions', label: 'Сессии', Icon: KeyRound },
  { id: 'users', label: 'Пользователи', Icon: Users },
  { id: 'sites', label: 'Сайты', Icon: Globe },
  { id: 'audit', label: 'Аудит', Icon: ScrollText },
  { id: 'export', label: 'Экспорт', Icon: Download },
] as const;
type TabId = typeof TABS[number]['id'];

const ALERT_META: Record<AlertLevel, { label: string; cls: string }> = {
  critical: { label: 'Критично', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  warn: { label: 'Внимание', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  info: { label: 'Инфо', cls: 'bg-primary/10 text-primary' },
};
const ALERT_KIND: Record<string, string> = {
  burst: 'Всплеск разрушительных действий',
  off_hours: 'Активность в нерабочие часы',
  export: 'Экспорт данных',
  role_change: 'Изменение роли',
  impersonation: 'Вход под пользователем',
  destructive: 'Удаление',
  many_sessions: 'Много активных сессий',
};

const QUALITY_LABEL: Record<string, string> = {
  emptyDrafts: 'Пустые черновики',
  brokenDocs: 'Битые документы',
  staleDrafts: 'Заброшенные черновики (7+ дней)',
  unverifiedDomains: 'Неподтверждённые домены',
  orphanSubmissions: 'Заявки без сайта',
  expiredSessions: 'Истёкшие сессии в БД',
  usersNoSites: 'Пользователи без сайтов',
};

const EXPORT_TYPES = [
  { type: 'users', label: 'Пользователи', Icon: Users, hint: 'ID, email, роль, статус, регистрация' },
  { type: 'sites', label: 'Сайты', Icon: Globe, hint: 'Владельцы, публикация, даты' },
  { type: 'sessions', label: 'Сессии', Icon: KeyRound, hint: 'Устройства, IP, активность' },
  { type: 'submissions', label: 'Заявки', Icon: Inbox, hint: 'Все формы со всех сайтов' },
  { type: 'audit', label: 'Аудит', Icon: ScrollText, hint: 'Журнал действий (до 5000)' },
] as const;

function Dot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />;
}
const when = (iso: string) => new Date(iso).toLocaleString('ru-RU');

/** "только что" / "12 мин назад" / "3 ч назад" / date. */
function ago(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

/** Online / offline-with-last-seen / blocked badge. */
function PresenceBadge({ u }: { u: Pick<UserRow, 'online' | 'lastSeen' | 'isActive'> }) {
  if (!u.isActive) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"><Ban className="h-3 w-3" /> Заблокирован</span>;
  }
  if (u.online) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span> Онлайн</span>;
  }
  return <span className="text-xs text-muted-foreground">{ago(u.lastSeen)}</span>;
}

/** Live-pulse tile: value for 24h, per-hour figure, trend vs previous 24h. */
function PulseCard({ label, metric, icon: Icon }: { label: string; metric: PulseMetric; icon: React.ComponentType<{ className?: string }> }) {
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
        <p className="text-2xl font-black tracking-tight">{metric.last24h}<span className="ml-1 text-xs font-medium text-muted-foreground">/ 24ч</span></p>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trendCls}`}><Trend className="h-3.5 w-3.5" /> {delta > 0 ? `+${delta}` : delta}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{metric.lastHour} за последний час</p>
    </div>
  );
}

export function ControlCenter({ meId, stats, system, activity, sessions, users, sites, audit, pulse, security, quality, backup }: {
  meId: string; stats: Stats; system: System; activity: ActivityEvent[]; sessions: SessionRow[]; users: UserRow[]; sites: SiteRow[]; audit: AuditRow[];
  pulse: Pulse; security: Security; quality: Quality; backup: Backup;
}) {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [tab, setTab] = useState<TabId>('monitor');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');

  const act = async (key: string, fn: () => Promise<Response>, confirmOpts?: ConfirmOptions, onOk?: (data: Record<string, unknown>) => void) => {
    if (confirmOpts && !(await confirm(confirmOpts))) return;
    setBusy(key);
    setMsg('');
    setNotice('');
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data.error || 'Ошибка операции.'); return; }
      onOk?.(data);
      router.refresh();
    } catch {
      setMsg('Сеть недоступна.');
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
      title: `Войти под пользователем ${u.name || u.email}?`,
      description: 'Вы увидите платформу его глазами. В любой момент сможете вернуться в свой аккаунт.',
      confirmLabel: 'Войти как',
      tone: 'neutral',
    });

  const deleteUser = (u: UserRow) =>
    act(`del-${u.id}`, () => fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' }), {
      title: `Удалить ${u.name || u.email}?`,
      description: 'Пользователь будет удалён вместе со всеми его сайтами, сессиями и заявками. Действие необратимо.',
      confirmLabel: 'Удалить',
      tone: 'danger',
    });

  const toggleActive = (u: UserRow) =>
    act(`sus-${u.id}`, () => fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: u.isActive ? 'suspend' : 'activate' }) }),
      u.isActive
        ? { title: `Заблокировать ${u.name || u.email}?`, description: 'Все активные сессии будут немедленно завершены, вход в аккаунт станет невозможен до разблокировки.', confirmLabel: 'Заблокировать', tone: 'warning' }
        : { title: `Разблокировать ${u.name || u.email}?`, description: 'Пользователь снова сможет входить в аккаунт.', confirmLabel: 'Разблокировать', tone: 'neutral' });

  const revokeUser = (u: UserRow) =>
    act(`rev-${u.id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) }), {
      title: `Завершить все сессии ${u.name || u.email}?`,
      description: 'Пользователь будет разлогинен на всех устройствах, но сможет войти снова.',
      confirmLabel: 'Завершить',
      tone: 'warning',
    });

  const revokeSession = (s: SessionRow) =>
    act(`revs-${s.id}`, () => fetch('/api/admin/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) }));

  const unpublish = (s: SiteRow) =>
    act(`unp-${s.id}`, () => fetch(`/api/admin/sites/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpublish' }) }), {
      title: `Снять «${s.name}» с публикации?`,
      description: 'Сайт перестанет открываться у посетителей, но черновик останется у владельца.',
      confirmLabel: 'Снять',
      tone: 'warning',
    });

  const deleteSite = (s: SiteRow) =>
    act(`dels-${s.id}`, () => fetch(`/api/admin/sites/${s.id}`, { method: 'DELETE' }), {
      title: `Удалить сайт «${s.name}»?`,
      description: 'Страницы, домены и заявки сайта будут удалены безвозвратно.',
      confirmLabel: 'Удалить',
      tone: 'danger',
    });

  const cleanupSessions = () =>
    act('cleanup', () => fetch('/api/admin/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup-sessions' }) }),
      undefined,
      (data) => setNotice(`Очистка выполнена: удалено ${data.removed ?? 0} истёкших сессий.`));

  const qualityIssues = Object.entries(quality.counts).filter(([, n]) => n > 0);
  const scoreCls = quality.score >= 90 ? 'text-green-500' : quality.score >= 70 ? 'text-amber-500' : 'text-red-500';

  return (
    <>
      {confirmDialog}
      <PageHeader
        title={<span className="inline-flex items-center gap-2"><Crown className="h-6 w-6 text-amber-500" /> Центр контроля</span>}
        description="Полный мониторинг и управление платформой. Доступно только суперадмину."
        action={<Button variant="outline" className="gap-1.5" onClick={() => setTab('export')}><Download className="h-4 w-4" /> Экспорты</Button>}
      />

      {msg && <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">{msg}</p>}
      {notice && <p className="mb-3 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400" role="status">{notice}</p>}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <t.Icon className="h-4 w-4" /> {t.label}
            {t.id === 'security' && security.counts.critical + security.counts.warn > 0 && (
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
            <StatCard label="Пользователи" value={stats.users} icon={Users} hint={`${users.filter((u) => u.online).length} онлайн`} />
            <StatCard label="Сайты" value={stats.sites} icon={Globe} hint={`${stats.published} опубликовано`} />
            <StatCard label="Заявки" value={stats.submissions} icon={Inbox} />
            <StatCard label="Активные сессии" value={system.activeSessions} icon={KeyRound} />
          </div>

          {/* Live pulse */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><HeartPulse className="h-4 w-4" /> Пульс платформы <span className="text-[11px] font-medium normal-case tracking-normal">— 24 часа против предыдущих 24</span></h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <PulseCard label="Регистрации" metric={pulse.registrations} icon={UserPlus} />
              <PulseCard label="Входы" metric={pulse.logins} icon={LogIn} />
              <PulseCard label="Новые сайты" metric={pulse.newSites} icon={FilePlus2} />
              <PulseCard label="Публикации" metric={pulse.publishes} icon={Send} />
              <PulseCard label="Заявки" metric={pulse.submissions} icon={Inbox} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Data quality */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Gauge className="h-4 w-4" /> Качество данных</h3>
              <div className="flex items-center gap-4">
                <p className={`text-4xl font-black tracking-tight ${scoreCls}`}>{quality.score}<span className="text-base font-semibold text-muted-foreground">/100</span></p>
                <p className="text-sm text-muted-foreground">{quality.totalIssues === 0 ? 'Проблем не найдено — всё чисто.' : `${quality.totalIssues} проблем на ${quality.siteCount} сайтах.`}</p>
              </div>
              {qualityIssues.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm">
                  {qualityIssues.map(([key, n]) => (
                    <li key={key} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{QUALITY_LABEL[key] ?? key}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(quality.counts.expiredSessions ?? 0) > 0 && (
                <Button size="sm" variant="outline" disabled={busy === 'cleanup'} onClick={cleanupSessions} className="mt-4 gap-1.5">
                  {busy === 'cleanup' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eraser className="h-3.5 w-3.5" />} Очистить истёкшие сессии
                </Button>
              )}
            </div>

            {/* Hot sites + backup */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Flame className="h-4 w-4" /> Горячие сайты (заявки за 24ч)</h3>
                {pulse.hotSites.length === 0 && <p className="text-sm text-muted-foreground">За последние сутки заявок не было.</p>}
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
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><ArchiveRestore className="h-4 w-4" /> Резервная копия</h3>
                {backup.lastAt ? (
                  <p className="text-sm">
                    Последняя: <span className="font-medium">{when(backup.lastAt)}</span>
                    <span className="text-muted-foreground"> · {backup.byEmail} · {backup.ageHours} ч назад</span>
                    {backup.ageHours !== null && backup.ageHours > 24 * 7 && <span className="ml-1 font-semibold text-amber-500">— пора обновить</span>}
                  </p>
                ) : (
                  <p className="text-sm text-amber-500">Резервная копия ещё ни разу не снималась.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="/api/admin/export-db"><Button size="sm" variant="outline" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" /> Файл .db</Button></a>
                  <a href="/api/admin/export-db?format=json"><Button size="sm" variant="outline" className="gap-1.5"><FileJson className="h-3.5 w-3.5" /> JSON-снапшот</Button></a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Monitor className="h-4 w-4" /> Система</h3>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Хост</dt><dd className="font-medium">{system.appHost}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Node</dt><dd className="font-medium">{system.node}</dd></div>
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5 text-muted-foreground"><Database className="h-3.5 w-3.5" /> Размер БД</dt><dd className="font-medium">{system.dbSizeKb} КБ</dd></div>
              </dl>
              <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Интеграции</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.muapi} /> ИИ-видео (MUAPI)</span>
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.llm} /> LLM темы</span>
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.analytics} /> Аналитика</span>
                <span className="inline-flex items-center gap-2"><Dot ok={system.integrations.serverIp} /> SERVER_IP</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground"><Activity className="h-4 w-4" /> Активность</h3>
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {activity.length === 0 && <p className="text-sm text-muted-foreground">Событий пока нет.</p>}
                {activity.map((e, i) => {
                  const Icon = ACT_ICON[e.kind];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{when(e.at)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Критичные" value={security.counts.critical} icon={ShieldAlert} hint="за 48 часов" />
            <StatCard label="Предупреждения" value={security.counts.warn} icon={ShieldCheck} hint="за 48 часов" />
            <StatCard label="Информационные" value={security.counts.info} icon={Activity} hint="за 48 часов" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Уровень</th><th className="px-4 py-3">Событие</th><th className="hidden px-4 py-3 sm:table-cell">Кто</th><th className="px-4 py-3">Когда</th></tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {security.alerts.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground"><ShieldCheck className="mx-auto mb-2 h-8 w-8 text-green-500/60" />Аномалий за последние 48 часов не обнаружено.</td></tr>
                )}
                {security.alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${ALERT_META[a.level].cls}`}>{ALERT_META[a.level].label}</span></td>
                    <td className="px-4 py-3"><p className="font-medium">{ALERT_KIND[a.kind] ?? a.kind}</p><p className="text-xs text-muted-foreground">{a.detail}</p></td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{a.actor}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{when(a.at)}</td>
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
              <tr><th className="px-4 py-3">Пользователь</th><th className="hidden px-4 py-3 lg:table-cell">Устройство / IP</th><th className="hidden px-4 py-3 md:table-cell">Активность</th><th className="hidden px-4 py-3 md:table-cell">Истекает</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-medium">{s.userName || 'Без имени'}</p><p className="text-xs text-muted-foreground">{s.userEmail}</p></td>
                  <td className="hidden px-4 py-3 lg:table-cell"><p>{s.device}</p><p className="font-mono text-xs text-muted-foreground">{s.ip || '—'}</p></td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{ago(s.lastActiveAt ?? s.createdAt)}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{when(s.expiresAt)}</td>
                  <td className="px-4 py-3">
                    {s.online ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3" /> Онлайн</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Clock className="h-3 w-3" /> {s.active ? 'Активна' : 'Истекла'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" disabled={busy === `revs-${s.id}`} onClick={() => revokeSession(s)} className="gap-1.5 text-red-500 hover:text-red-600">
                      {busy === `revs-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Отозвать
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
              <tr><th className="px-4 py-3">Пользователь</th><th className="hidden px-4 py-3 sm:table-cell">Роль</th><th className="px-4 py-3">Статус</th><th className="hidden px-4 py-3 md:table-cell">Сайты / сессии</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const meta = ROLE_META[u.role];
                const self = u.id === meId;
                return (
                  <tr key={u.id} className={`hover:bg-muted/20 ${u.isActive ? '' : 'opacity-70'}`}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/users/${u.id}`} className="group flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(u.name || u.email).charAt(0).toUpperCase()}</div>
                        <div className="min-w-0"><p className="truncate font-medium group-hover:text-primary">{u.name || 'Без имени'}{self && <span className="ml-1 text-xs text-muted-foreground">(вы)</span>}</p><p className="truncate text-xs text-muted-foreground">{u.email}</p></div>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}><meta.Icon className="h-3 w-3" /> {meta.label}</span></td>
                    <td className="px-4 py-3"><PresenceBadge u={u} /></td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{u.siteCount} / {u.activeSessions}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link href={`/dashboard/users/${u.id}`}><Button size="sm" variant="ghost" className="gap-1.5" title="Досье"><IdCard className="h-3.5 w-3.5" /></Button></Link>
                        {!self && (
                          <>
                            <Button size="sm" variant="outline" disabled={busy === `imp-${u.id}` || !u.isActive} onClick={() => impersonate(u)} className="gap-1.5">
                              {busy === `imp-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} Войти как
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `sus-${u.id}`} onClick={() => toggleActive(u)} className={`gap-1.5 ${u.isActive ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}`} title={u.isActive ? 'Заблокировать' : 'Разблокировать'}>
                              {busy === `sus-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.isActive ? <Ban className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `rev-${u.id}`} onClick={() => revokeUser(u)} className="gap-1.5" title="Завершить все сессии">
                              {busy === `rev-${u.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === `del-${u.id}`} onClick={() => deleteUser(u)} className="gap-1.5 text-red-500 hover:text-red-600" title="Удалить пользователя">
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
              <tr><th className="px-4 py-3">Сайт</th><th className="hidden px-4 py-3 sm:table-cell">Владелец</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3 text-right">Действия</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">/s/{s.slug}</p></td>
                  <td className="hidden px-4 py-3 sm:table-cell"><p className="truncate">{s.ownerName || '—'}</p><p className="truncate text-xs text-muted-foreground">{s.ownerEmail}</p></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {s.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {s.published ? 'Опубликован' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/s/${s.slug}?draft=1`} target="_blank"><Button size="sm" variant="ghost" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /></Button></Link>
                      {s.published && (
                        <Button size="sm" variant="outline" disabled={busy === `unp-${s.id}`} onClick={() => unpublish(s)} className="gap-1.5">
                          {busy === `unp-${s.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Снять
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" disabled={busy === `dels-${s.id}`} onClick={() => deleteSite(s)} className="gap-1.5 text-red-500 hover:text-red-600" title="Удалить сайт">
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
              <tr><th className="px-4 py-3">Действие</th><th className="px-4 py-3">Кто</th><th className="hidden px-4 py-3 sm:table-cell">Объект / детали</th><th className="px-4 py-3">Когда</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {audit.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Записей аудита пока нет.</td></tr>
              )}
              {audit.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{a.action}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.actorEmail}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="font-medium">{a.target}</span>
                    {a.detail && <span className="text-muted-foreground"> · {a.detail}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{when(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'export' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORT_TYPES.map((e) => (
              <div key={e.type} className="rounded-2xl border border-border/60 bg-card/50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><e.Icon className="h-4.5 w-4.5" /></span>
                  <div><p className="font-semibold">{e.label}</p><p className="text-xs text-muted-foreground">{e.hint}</p></div>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/admin/export?type=${e.type}`} className="flex-1"><Button size="sm" variant="default" className="w-full gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> XLSX</Button></a>
                  <a href={`/api/admin/export?type=${e.type}&format=csv`} className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><FileText className="h-3.5 w-3.5" /> CSV</Button></a>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500"><Database className="h-4.5 w-4.5" /></span>
                <div><p className="font-semibold">Вся база данных</p><p className="text-xs text-muted-foreground">Полный бэкап для восстановления</p></div>
              </div>
              <div className="flex gap-2">
                <a href="/api/admin/export-db" className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><HardDrive className="h-3.5 w-3.5" /> SQLite .db</Button></a>
                <a href="/api/admin/export-db?format=json" className="flex-1"><Button size="sm" variant="outline" className="w-full gap-1.5"><FileJson className="h-3.5 w-3.5" /> JSON</Button></a>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">XLSX-файлы отформатированы (фирменная шапка, зебра, автофильтр) и готовы к отправке. Каждый экспорт фиксируется в аудите.</p>
        </div>
      )}
    </>
  );
}
