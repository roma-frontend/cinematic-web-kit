'use client';

// Professional self-service account for a tenant site's end-users. Themed with
// the tenant's own tokens, wired to the isolated /api/site-auth (scoped by
// siteId). Tabs: overview · profile · materials · notifications · security ·
// activity · settings. Localized (ru/en/hy) via lib/site-account-dict.ts.

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  User, Shield, FileText, Settings, LogOut, Loader2, Check, Mail, Phone, Lock,
  Eye, EyeOff, Monitor, Smartphone, Trash2, Save, CalendarDays, ShieldCheck, X,
  Store, Menu, ExternalLink, Library, Clock, Ban, LinkIcon, Bell,
  LayoutDashboard, ChevronRight, Search, Copy, Wand2, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { iconCls, passwordScore, StrengthMeter } from '@/components/auth/auth-ui';
import { SiteThemeToggle } from '@/components/builder/site-theme-toggle';
import { useLocale } from '@/hooks/use-locale';
import { BCP47, type Locale } from '@/lib/seo';
import { siteAccountDict, type SiteAccountDict } from '@/lib/site-account-dict';
import { LanguageSwitcher } from '../language-switcher';

type Me = {
  id: string; email: string; name: string; phone: string; avatarColor: string;
  emailNotify: boolean; marketing: boolean; locale: string; status: string; rejectionReason?: string;
  createdAt: string | number | Date; lastLoginAt: string | number | Date | null;
};
type SessionRow = { id: string; userAgent: string; ip: string; createdAt: string | number | Date; lastActiveAt: string | number | Date | null; current: boolean };
type Submission = { id: string; formId: string; data: Record<string, unknown>; createdAt: string | number | Date };

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#64748b'];

async function api(action: string, body: Record<string, unknown>, networkError = 'Network unavailable') {
  try {
    const res = await fetch('/api/site-auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error as string | undefined, user: data.user as Me | undefined };
  } catch {
    return { ok: false, error: networkError };
  }
}

function fmtDate(v: string | number | Date | null | undefined, locale: Locale) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(BCP47[locale], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDay(v: string | number | Date | null | undefined, locale: Locale) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(BCP47[locale], { day: '2-digit', month: 'long', year: 'numeric' });
}
function initials(name: string, email: string) {
  const n = name.trim();
  if (n) return n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (email[0] ?? '?').toUpperCase();
}
function deviceLabel(ua: string, t: SiteAccountDict) {
  if (!ua) return t.unknownDevice;
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let os = t.device;
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let br = '';
  if (/Edg\//i.test(ua)) br = 'Edge';
  else if (/Chrome\//i.test(ua)) br = 'Chrome';
  else if (/Firefox\//i.test(ua)) br = 'Firefox';
  else if (/Safari\//i.test(ua)) br = 'Safari';
  return { label: `${br ? br + ' · ' : ''}${os}`, mobile };
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background/60 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>}
      </span>
      <button
        type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

const TABS = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'profile', icon: User },
  { id: 'materials', icon: Library },
  { id: 'notifications', icon: Bell },
  { id: 'security', icon: Shield },
  { id: 'activity', icon: FileText },
  { id: 'settings', icon: Settings },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function SiteAccount({ siteId, base, brand }: { siteId: string; base: string; brand: string }) {
  const router = useRouter();
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');
  const [loggingOut, setLoggingOut] = useState(false);
  const [open, setOpen] = useState(false); // mobile sidebar
  const [unread, setUnread] = useState(0);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- setMe is a stable setter; siteId is the only real dep.
  const refresh = useCallback(() => {
    return fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json()).then((d) => setMe(d.user ?? null)).catch(() => {});
  }, [siteId]);

  const loadUnread = useCallback(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=notifications`)
      .then((r) => r.json()).then((d) => setUnread(d.unread ?? 0)).catch(() => {});
  }, [siteId]);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => { loadUnread(); }, [loadUnread]);

  const openTab = (id: TabId) => {
    setTab(id); setOpen(false);
    if (id === 'notifications' && unread > 0) { api('mark-notifications-read', { siteId }, t.networkError); setUnread(0); }
  };

  const logout = async () => { setLoggingOut(true); await api('logout', { siteId }, t.networkError); router.push(`${base}/login`); router.refresh(); };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!me) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-muted-foreground">{t.notSignedIn}</p>
        <div className="flex gap-3">
          <Link href={`${base}/login`}><Button size="lg">{t.signIn}</Button></Link>
          <Link href={`${base}/register`}><Button size="lg" variant="outline">{t.register}</Button></Link>
        </div>
      </main>
    );
  }

  // Org-isolation gate: non-approved members can't see member content at all.
  if (me.status && me.status !== 'approved') {
    return <MembershipGate me={me} base={base} brand={brand} onLogout={logout} loggingOut={loggingOut} />;
  }

  const color = me.avatarColor || AVATAR_COLORS[0];
  const activeLabel = t.tabs[tab] ?? t.accountFallback;

  const SidebarBody = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <Link href={base || '/'} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
            <Store className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="truncate text-sm font-black tracking-tight">{brand}</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t.cabinet}</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {TABS.map((tabDef) => {
          const Icon = tabDef.icon;
          const on = tab === tabDef.id;
          return (
            <button
              key={tabDef.id}
              onClick={() => openTab(tabDef.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                on ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.tabs[tabDef.id]}</span>
              {tabDef.id === 'notifications' && unread > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{unread}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color }}>
            {initials(me.name, me.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me.name || t.noName}</p>
            <p className="truncate text-xs text-muted-foreground">{me.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={logout} disabled={loggingOut}>
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} {t.logout}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-muted/30 lg:flex">
        {SidebarBody}
      </aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border/60 bg-background shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label={t.closeMenu} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label={t.openMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight">{activeLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href={base || '/'} className="hidden sm:block">
              <Button size="sm" variant="outline" className="gap-1.5">{t.toSite} <ExternalLink className="h-4 w-4" /></Button>
            </Link>
            <SiteThemeToggle siteId={siteId} />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {tab === 'overview' ? (
                  <OverviewTab siteId={siteId} me={me} unread={unread} onNavigate={openTab} />
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
                    {tab === 'profile' && <ProfileTab siteId={siteId} me={me} onSaved={setMe} />}
                    {tab === 'materials' && <MaterialsTab siteId={siteId} />}
                    {tab === 'notifications' && <NotificationsTab siteId={siteId} />}
                    {tab === 'security' && <SecurityTab siteId={siteId} />}
                    {tab === 'activity' && <ActivityTab siteId={siteId} />}
                    {tab === 'settings' && <SettingsTab siteId={siteId} base={base} me={me} onSaved={setMe} router={router} />}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

type Notif = { id: string; type: string; title: string; message: string; read: boolean; createdAt: string | number | Date };
type Overview = {
  unread: number; notificationsCount: number; recentNotifications: Notif[];
  materialsCount: number; recentMaterials: Material[];
  submissionsCount: number; sessionsCount: number;
};

function greeting(name: string, t: SiteAccountDict) {
  const h = new Date().getHours();
  const word = h < 5 ? t.greetNight : h < 12 ? t.greetMorning : h < 18 ? t.greetDay : t.greetEvening;
  return name ? `${word}, ${name.split(/\s+/)[0]}!` : `${word}!`;
}

function OverviewTab({ siteId, me, unread, onNavigate }: { siteId: string; me: Me; unread: number; onNavigate: (t: TabId) => void }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [ov, setOv] = useState<Overview | null>(null);
  useEffect(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=overview`)
      .then((r) => r.json()).then((d) => setOv(d)).catch(() => {});
  }, [siteId]);

  const color = me.avatarColor || AVATAR_COLORS[0];
  const checklist = [
    { done: !!me.name.trim(), label: t.checklistName },
    { done: !!me.phone.trim(), label: t.checklistPhone },
    { done: !!me.avatarColor, label: t.checklistAvatar },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);

  const stats: { id: TabId; label: string; value: number | null; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'materials', label: t.statMaterials, value: ov?.materialsCount ?? null, icon: Library },
    { id: 'notifications', label: t.statNotifications, value: ov?.notificationsCount ?? null, icon: Bell, badge: unread },
    { id: 'activity', label: t.statActivity, value: ov?.submissionsCount ?? null, icon: FileText },
    { id: 'security', label: t.statDevices, value: ov?.sessionsCount ?? null, icon: Monitor },
  ];

  return (
    <div className="space-y-5">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg" style={{ background: color }}>
            {initials(me.name, me.email)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{greeting(me.name, t)}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {me.email}</span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {t.withUsSince} {fmtDay(me.createdAt, locale)}</span>
            </p>
          </div>
          <div className="flex flex-none gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate('profile')}>
              <User className="h-3.5 w-3.5" /> {t.profileBtn}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate('security')}>
              <KeyRound className="h-3.5 w-3.5" /> {t.passwordBtn}
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className="group rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {!!s.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{s.badge}</span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{s.value ?? '—'}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                {s.label} <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </button>
          );
        })}
      </div>

      {/* Profile completeness */}
      {percent < 100 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{t.completeTitle}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.completeDesc(percent)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate('profile')}>{t.completeCta}</Button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {checklist.map((c) => (
              <li key={c.label} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                c.done ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-border bg-muted/40 text-muted-foreground'
              }`}>
                {c.done ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />} {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" /> {t.recentNotifications}</h2>
            <button onClick={() => onNavigate('notifications')} className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              {t.seeAll} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {!ov ? (
            <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : ov.recentNotifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.noNotificationsYet}</p>
          ) : (
            <ul className="space-y-2">
              {ov.recentNotifications.map((n) => (
                <li key={n.id} className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</p>
                    <span className="flex-none text-[11px] text-muted-foreground">{fmtDate(n.createdAt, locale)}</span>
                  </div>
                  {n.message && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Library className="h-4 w-4 text-primary" /> {t.recentMaterials}</h2>
            <button onClick={() => onNavigate('materials')} className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              {t.seeAll} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {!ov ? (
            <div className="py-6 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : ov.recentMaterials.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.noMaterialsYet}</p>
          ) : (
            <ul className="space-y-2">
              {ov.recentMaterials.map((m) => (
                <li key={m.id} className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{m.title || t.noTitle}</p>
                    <span className="flex-none text-[11px] text-muted-foreground">{fmtDay(m.createdAt, locale)}</span>
                  </div>
                  {m.body && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{m.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [all, setAll] = useState<Notif[] | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  useEffect(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=notifications`)
      .then((r) => r.json()).then((d) => setAll(d.notifications ?? [])).catch(() => setAll([]));
  }, [siteId]);

  const unreadCount = all?.filter((n) => !n.read).length ?? 0;
  const items = all && onlyUnread ? all.filter((n) => !n.read) : all;

  const dot = (ty: string) => ty === 'join_approved' || ty === 'material' ? 'bg-green-500' : ty === 'join_rejected' || ty === 'suspended' ? 'bg-red-500' : 'bg-primary';

  return (
    <div>
      <SectionTitle title={t.notificationsTitle} desc={t.notificationsDesc} />
      {all && all.length > 0 && (
        <div className="mb-4 flex gap-2">
          {([[t.filterAll, false], [`${t.filterUnread}${unreadCount ? ` · ${unreadCount}` : ''}`, true]] as const).map(([label, v]) => (
            <button
              key={label}
              onClick={() => setOnlyUnread(v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                onlyUnread === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!items ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{onlyUnread ? t.noUnread : t.noNotificationsYet}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
              <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${dot(n.type)}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <span className="flex-none text-xs text-muted-foreground">{fmtDate(n.createdAt, locale)}</span>
                </div>
                {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MembershipGate({ me, base, brand, onLogout, loggingOut }: { me: Me; base: string; brand: string; onLogout: () => void; loggingOut: boolean }) {
  const t = siteAccountDict(useLocale().locale);
  const rejected = me.status === 'rejected';
  const suspended = me.status === 'suspended';
  const Icon = rejected || suspended ? Ban : Clock;
  const title = rejected ? t.gateRejectedTitle : suspended ? t.gateSuspendedTitle : t.gatePendingTitle;
  const text = rejected
    ? t.gateRejectedText
    : suspended
      ? t.gateSuspendedText
      : t.gatePendingText;
  const tone = rejected || suspended ? 'text-red-500' : 'text-amber-500';
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background/80 p-8 text-center shadow-2xl backdrop-blur-md">
        <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted ${tone}`}>
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">{brand}</p>
        <p className="mt-4 text-sm text-muted-foreground">{text}</p>
        {(rejected || suspended) && me.rejectionReason && (
          <p className="mt-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm"><span className="text-muted-foreground">{t.gateReason}</span>{me.rejectionReason}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link href={base || '/'}><Button variant="outline">{t.toSite}</Button></Link>
          <Button variant="ghost" onClick={onLogout} disabled={loggingOut} className="gap-2">
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} {t.logout}
          </Button>
        </div>
      </div>
    </main>
  );
}

type Material = { id: string; title: string; body: string; url: string; createdAt: string | number | Date };

const NEW_MS = 7 * 24 * 60 * 60 * 1000; // «новое» — моложе недели

function MaterialsTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [items, setItems] = useState<(Material & { isNew: boolean })[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=materials`)
      .then((r) => r.json())
      .then((d) => {
        // «Новое» stamped at load time — render stays pure (no Date.now() there).
        const now = Date.now();
        const list = ((d.materials ?? []) as Material[]).map((m) => ({ ...m, isNew: now - new Date(m.createdAt).getTime() < NEW_MS }));
        setItems(list);
      })
      .catch(() => setItems([]));
  }, [siteId]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((m) => `${m.title} ${m.body}`.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <div>
      <SectionTitle title={t.materialsTitle} desc={t.materialsDesc} />
      {items && items.length > 0 && (
        <div className="relative mb-4">
          <Search className={iconCls} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchMaterials} className="h-11 pl-10" />
        </div>
      )}
      {!filtered ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <Library className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{q ? t.nothingFound : t.noMaterialsYet}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => {
            const isNew = m.isNew;
            return (
              <li key={m.id} className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="truncate">{m.title || t.noTitle}</span>
                    {isNew && <span className="flex-none rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{t.badgeNew}</span>}
                  </h3>
                  <span className="flex-none text-xs text-muted-foreground">{fmtDay(m.createdAt, locale)}</span>
                </div>
                {m.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.body}</p>}
                {m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <LinkIcon className="h-3.5 w-3.5" /> {t.openLink}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Notice({ kind, children }: { kind: 'ok' | 'err'; children: React.ReactNode }) {
  const cls = kind === 'ok'
    ? 'border-green-500/20 bg-green-500/10 text-green-600'
    : 'border-red-500/20 bg-red-500/10 text-red-500';
  return <div role="alert" className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${cls}`}>{kind === 'ok' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{children}</div>;
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
    </div>
  );
}

function ProfileTab({ siteId, me, onSaved }: { siteId: string; me: Me; onSaved: (u: Me) => void }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [avatarColor, setAvatarColor] = useState(me.avatarColor || AVATAR_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const dirty = name !== me.name || phone !== me.phone || avatarColor !== (me.avatarColor || AVATAR_COLORS[0]);

  const save = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await api('update-profile', { siteId, name, phone, avatarColor }, t.networkError);
    setBusy(false);
    if (!r.ok || !r.user) { setMsg({ kind: 'err', text: r.error || t.saveFailed }); return; }
    onSaved(r.user); setMsg({ kind: 'ok', text: t.profileSaved });
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <SectionTitle title={t.profileTitle} desc={t.profileDesc} />
      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md transition-colors duration-300" style={{ background: avatarColor }}>
          {initials(name, me.email)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name.trim() || t.noName}</p>
          <p className="truncate text-sm text-muted-foreground">{t.seenAs}</p>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t.labelName}</label>
        <div className="relative">
          <User className={iconCls} />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} className="h-11 pl-10" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t.labelPhone}</label>
        <div className="relative">
          <Phone className={iconCls} />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} inputMode="tel" className="h-11 pl-10" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t.labelEmail}</label>
        <div className="relative">
          <Mail className={iconCls} />
          <Input value={me.email} readOnly disabled className="h-11 pl-10 opacity-70" />
        </div>
        <p className="text-xs text-muted-foreground">{t.emailImmutable}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t.labelAvatarColor}</label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setAvatarColor(c)} aria-label={t.avatarColorAria(c)}
              className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition ${avatarColor === c ? 'ring-foreground' : 'ring-transparent'}`}
              style={{ background: c }}>
              {avatarColor === c && <Check className="mx-auto h-4 w-4 text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{t.withUsSinceRow}</span>
        <span className="ml-auto font-medium">{fmtDay(me.createdAt, locale)}</span>
      </div>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Button type="submit" size="lg" disabled={busy || !dirty} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t.save}
      </Button>
    </form>
  );
}

/** Cryptographically random 14-char password with all character classes. */
function generatePassword(): string {
  const sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*-_+'];
  const all = sets.join('');
  const buf = new Uint32Array(14);
  crypto.getRandomValues(buf);
  // Guarantee one char from each class, fill the rest from the full alphabet.
  const chars = sets.map((s, i) => s[buf[i] % s.length]);
  for (let i = sets.length; i < buf.length; i++) chars.push(all[buf[i] % all.length]);
  // Fisher–Yates with fresh randomness so the guaranteed chars aren't always first.
  const mix = new Uint32Array(chars.length);
  crypto.getRandomValues(mix);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = mix[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function SecurityTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const score = useMemo(() => passwordScore(next), [next]);

  const suggest = () => {
    const pw = generatePassword();
    setNext(pw); setConfirm(pw); setShow(true); setCopied(false);
  };
  const copyPw = async () => {
    try { await navigator.clipboard.writeText(next); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard denied */ }
  };

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [sesBusy, setSesBusy] = useState('');

  const loadSessions = useCallback(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=sessions`)
      .then((r) => r.json()).then((d) => setSessions(d.sessions ?? [])).catch(() => setSessions([]));
  }, [siteId]);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  const changePw = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (next.length < 6) { setMsg({ kind: 'err', text: t.pwTooShort }); return; }
    if (next !== confirm) { setMsg({ kind: 'err', text: t.pwMismatch }); return; }
    setBusy(true);
    const r = await api('change-password', { siteId, currentPassword: current, newPassword: next }, t.networkError);
    setBusy(false);
    if (!r.ok) { setMsg({ kind: 'err', text: r.error || t.pwChangeFailed }); return; }
    setMsg({ kind: 'ok', text: t.pwChanged }); setCurrent(''); setNext(''); setConfirm('');
  };

  const revoke = async (id: string) => { setSesBusy(id); await api('revoke-session', { siteId, sessionId: id }, t.networkError); setSesBusy(''); loadSessions(); };
  const revokeOthers = async () => { setSesBusy('all'); await api('revoke-others', { siteId }, t.networkError); setSesBusy(''); loadSessions(); };

  return (
    <div className="space-y-8">
      <form onSubmit={changePw} className="space-y-5">
        <SectionTitle title={t.changePwTitle} desc={t.changePwDesc} />
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.currentPw}</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input type={show ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="h-11 pl-10 pr-10" />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={t.showPassword}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t.newPw}</label>
            <div className="flex items-center gap-1">
              <button type="button" onClick={suggest} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
                <Wand2 className="h-3.5 w-3.5" /> {t.generate}
              </button>
              {next && (
                <button type="button" onClick={copyPw} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} {copied ? t.copied : t.copy}
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <Lock className={iconCls} />
            <Input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder={t.pwMin6Ph} className="h-11 pl-10" />
          </div>
          <StrengthMeter score={score} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.repeatNewPw}</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="h-11 pl-10" />
          </div>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Button type="submit" size="lg" disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {t.updatePw}
        </Button>
      </form>

      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle title={t.sessionsTitle} desc={t.sessionsDesc} />
          {sessions && sessions.length > 1 && (
            <Button type="button" size="sm" variant="outline" onClick={revokeOthers} disabled={sesBusy === 'all'} className="flex-none gap-2">
              {sesBusy === 'all' && <Loader2 className="h-4 w-4 animate-spin" />} {t.logoutOthers}
            </Button>
          )}
        </div>
        {!sessions ? (
          <div className="py-4 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noSessions}</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const dev = deviceLabel(s.userAgent, t);
              const label = typeof dev === 'string' ? dev : dev.label;
              const mobile = typeof dev === 'string' ? false : dev.mobile;
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
                  {mobile ? <Smartphone className="h-5 w-5 flex-none text-muted-foreground" /> : <Monitor className="h-5 w-5 flex-none text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{label}</span>
                      {s.current && <span className="flex-none rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600">{t.currentSession}</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{s.ip || t.ipHidden} · {t.activity} {fmtDate(s.lastActiveAt || s.createdAt, locale)}</p>
                  </div>
                  {!s.current && (
                    <button type="button" onClick={() => revoke(s.id)} disabled={sesBusy === s.id} aria-label={t.endSession} className="flex-none rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500">
                      {sesBusy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [items, setItems] = useState<Submission[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=submissions`)
      .then((r) => r.json()).then((d) => setItems(d.submissions ?? [])).catch(() => setItems([]));
  }, [siteId]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => `${it.formId} ${Object.values(it.data).join(' ')}`.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <div>
      <SectionTitle title={t.activityTitle} desc={t.activityDesc} />
      {items && items.length > 0 && (
        <div className="relative mb-4">
          <Search className={iconCls} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchActivity} className="h-11 pl-10" />
        </div>
      )}
      {!filtered ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{q ? t.nothingFound : t.noActivity}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((it) => {
            const fields = Object.entries(it.data).filter(([k]) => k !== 'formId').slice(0, 6);
            return (
              <li key={it.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{it.formId}</span>
                  <span className="text-xs text-muted-foreground">{fmtDate(it.createdAt, locale)}</span>
                </div>
                <dl className="grid gap-1 text-sm">
                  {fields.map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="min-w-24 flex-none capitalize text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 break-words font-medium">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SettingsTab({ siteId, base, me, onSaved, router }: { siteId: string; base: string; me: Me; onSaved: (u: Me) => void; router: ReturnType<typeof useRouter> }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const [emailNotify, setEmailNotify] = useState(me.emailNotify);
  const [marketing, setMarketing] = useState(me.marketing);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [confirmDel, setConfirmDel] = useState(false);
  const [delText, setDelText] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  const savePrefs = async (nextEmail: boolean, nextMkt: boolean) => {
    setEmailNotify(nextEmail); setMarketing(nextMkt); setBusy(true); setMsg(null);
    const r = await api('update-profile', { siteId, emailNotify: nextEmail, marketing: nextMkt }, t.networkError);
    setBusy(false);
    if (!r.ok || !r.user) { setMsg({ kind: 'err', text: r.error || t.saveFailed }); return; }
    onSaved(r.user); setMsg({ kind: 'ok', text: t.settingsSaved });
  };

  const del = async () => {
    setDelBusy(true);
    const r = await api('delete-account', { siteId }, t.networkError);
    if (!r.ok) { setDelBusy(false); setMsg({ kind: 'err', text: r.error || t.deleteFailed }); return; }
    router.push(base || '/'); router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SectionTitle title={t.settingsNotifTitle} desc={t.settingsNotifDesc} />
        {busy && <p className="text-xs text-muted-foreground">{t.saving}</p>}
        <Toggle checked={emailNotify} onChange={(v) => savePrefs(v, marketing)} label={t.serviceNotif} desc={t.serviceNotifDesc} />
        <Toggle checked={marketing} onChange={(v) => savePrefs(emailNotify, v)} label={t.marketingNotif} desc={t.marketingNotifDesc} />
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </div>

      <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-500"><Trash2 className="h-4 w-4" /> {t.deleteTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.deleteDesc}</p>
        </div>
        {!confirmDel ? (
          <Button type="button" variant="outline" className="border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={() => setConfirmDel(true)}>
            {t.deleteAccount}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{t.deleteConfirmPrefix} <span className="font-mono font-semibold">{t.deleteWord}</span>:</p>
            <Input value={delText} onChange={(e) => setDelText(e.target.value)} placeholder={t.deleteWord} className="h-11 max-w-xs" />
            <div className="flex gap-2">
              <Button type="button" disabled={delText.trim().toUpperCase() !== t.deleteWord.toUpperCase() || delBusy} onClick={del}
                className="gap-2 bg-red-600 text-white hover:bg-red-700">
                {delBusy && <Loader2 className="h-4 w-4 animate-spin" />} {t.deleteForever}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setConfirmDel(false); setDelText(''); }}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
