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
  LayoutDashboard, ChevronRight, ChevronLeft, Search, Copy, Wand2, KeyRound,
  LogIn, UserPlus,
  GraduationCap, PlayCircle, ArrowLeft, CheckCircle2, Circle,
  FolderOpen, Download, FileType,
  LifeBuoy, Send, MessageSquare, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { iconCls, passwordScore, StrengthMeter } from '@/components/auth/auth-ui';
import { SiteThemeToggle } from '@/components/builder/site-theme-toggle';
import { SiteUserMenu } from '@/components/builder/site-user-menu';
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
  { id: 'courses', icon: GraduationCap },
  { id: 'documents', icon: FolderOpen },
  { id: 'support', icon: LifeBuoy },
  { id: 'notifications', icon: Bell },
  { id: 'security', icon: Shield },
  { id: 'activity', icon: FileText },
  { id: 'settings', icon: Settings },
] as const;
type TabId = (typeof TABS)[number]['id'];
// Tabs that live under the drill-in "Account" parent (mirrors the platform
// dashboard's Staff/Superadmin sub-nav). The rest are top-level.
const ACCOUNT_TAB_IDS = new Set<TabId>(['profile', 'security', 'settings']);

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
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [subNav, setSubNav] = useState<'account' | null>(null);

  // Persist the desktop collapse preference; a collapsed rail can't drill in.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from localStorage (unavailable during SSR)
    try { setCollapsed(localStorage.getItem('cwk:site-sidebar-collapsed') === '1'); } catch { /* ignore */ }
  }, []);
  const toggleCollapsed = () => {
    const n = !collapsed;
    setCollapsed(n);
    if (n) setSubNav(null); // a collapsed rail has no room for the drill-in panel
    try { localStorage.setItem('cwk:site-sidebar-collapsed', n ? '1' : '0'); } catch { /* ignore */ }
  };

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
    // Selecting an Account sub-tab reveals the drill-in panel; a top-level tab closes it.
    setSubNav(ACCOUNT_TAB_IDS.has(id) ? 'account' : null);
    if (id === 'notifications' && unread > 0) { api('mark-notifications-read', { siteId }, t.networkError); setUnread(0); }
  };

  const logout = async () => { setLoggingOut(true); await api('logout', { siteId }, t.networkError); router.push(`${base}/login`); router.refresh(); };

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!me) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
        {/* Ambient, theme-aware glow so the empty state never feels flat. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[38%] h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,transparent,var(--background))]" />
        </div>

        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LanguageSwitcher />
          <SiteThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-inset ring-white/10">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{brand}</h1>
          <p className="mx-auto mt-2 max-w-[17rem] text-sm leading-relaxed text-muted-foreground">{t.notSignedIn}</p>

          <div className="mt-7 flex flex-col gap-2.5">
            <Link href={`${base}/login`} className="block">
              <Button size="lg" className="group w-full gap-2">
                <LogIn className="h-4 w-4" />
                {t.signIn}
                <ChevronRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href={`${base}/register`} className="block">
              <Button size="lg" variant="outline" className="w-full gap-2">
                <UserPlus className="h-4 w-4" />
                {t.register}
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  // Org-isolation gate: non-approved members can't see member content at all.
  if (me.status && me.status !== 'approved') {
    return <MembershipGate me={me} base={base} brand={brand} onLogout={logout} loggingOut={loggingOut} />;
  }

  const color = me.avatarColor || AVATAR_COLORS[0];
  const activeLabel = t.tabs[tab] ?? t.accountFallback;

  const renderSidebar = (col: boolean) => {
    const q = col ? '' : query.trim().toLowerCase();
    const topTabs = TABS.filter((x) => !ACCOUNT_TAB_IDS.has(x.id));
    const accTabs = TABS.filter((x) => ACCOUNT_TAB_IDS.has(x.id));
    const matched = q ? TABS.filter((x) => t.tabs[x.id].toLowerCase().includes(q)) : [];
    const accountActive = ACCOUNT_TAB_IDS.has(tab);

    const tabRow = (tabDef: (typeof TABS)[number]) => {
      const Icon = tabDef.icon;
      const on = tab === tabDef.id;
      return (
        <button
          key={tabDef.id}
          onClick={() => openTab(tabDef.id)}
          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${on ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {on && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
          <Icon className={`h-4 w-4 shrink-0 transition-transform ${on ? 'scale-110' : ''}`} />
          <span className="truncate">{t.tabs[tabDef.id]}</span>
          {tabDef.id === 'notifications' && unread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{unread}</span>
          )}
        </button>
      );
    };

    return (
      <>
        {/* Header: brand + desktop collapse toggle */}
        <div className={`flex h-16 items-center border-b border-border/60 ${col ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
          {!col && (
            <Link href={base || '/'} className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
                <Store className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate text-sm font-black tracking-tight">{brand}</span>
                <span className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t.cabinet}</span>
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={col ? t.sidebar.expand : t.sidebar.collapse}
            title={col ? t.sidebar.expand : t.sidebar.collapse}
            className={`hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex ${col ? '' : 'ml-auto'}`}
          >
            {col ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Section search */}
        {!col && !subNav && (
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.sidebar.search}
                className="w-full rounded-lg border border-border bg-background/60 py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label={t.closeMenu} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation: collapsed rail · search results · drill-in */}
        {col ? (
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
            {TABS.map((tabDef, i) => {
              const Icon = tabDef.icon;
              const on = tab === tabDef.id;
              return (
                <div key={tabDef.id}>
                  {i === topTabs.length && <div className="mx-auto my-2 h-px w-8 bg-border/60" />}
                  <button
                    onClick={() => openTab(tabDef.id)}
                    title={t.tabs[tabDef.id]}
                    aria-label={t.tabs[tabDef.id]}
                    className={`group relative my-1 flex w-full items-center justify-center rounded-lg px-2 py-2.5 transition-colors ${on ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  >
                    {on && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                    <Icon className={`h-4 w-4 shrink-0 transition-transform ${on ? 'scale-110' : ''}`} />
                    {tabDef.id === 'notifications' && unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
                  </button>
                </div>
              );
            })}
          </nav>
        ) : q ? (
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {matched.length === 0
              ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t.sidebar.noResults}</p>
              : matched.map((x) => tabRow(x))}
          </nav>
        ) : (
          <nav className="relative flex-1 overflow-hidden">
            {/* Main level */}
            <div
              className="absolute inset-0 space-y-1 overflow-y-auto p-3 transition-all duration-300 ease-out"
              style={{ transform: subNav ? 'translateX(-100%)' : 'translateX(0)', opacity: subNav ? 0 : 1, pointerEvents: subNav ? 'none' : 'auto' }}
            >
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.sidebar.groupWorkspace}</p>
              {topTabs.map((x) => tabRow(x))}
              <div className="my-2 h-px bg-border/60" />
              <div className={`group relative flex items-center rounded-lg text-sm font-medium transition-colors ${accountActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                {accountActive && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                <button type="button" onClick={() => setSubNav('account')} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                  <Settings className={`h-4 w-4 shrink-0 transition-transform ${accountActive ? 'scale-110' : ''}`} />
                  <span className="truncate text-left">{t.sidebar.groupAccount}</span>
                </button>
                <button type="button" onClick={() => setSubNav('account')} aria-label={t.sidebar.groupAccount} className="flex items-center self-stretch rounded-r-lg px-2 text-muted-foreground transition-colors hover:text-foreground">
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Sub level (Account) — slides in with a staggered reveal */}
            <div
              className="absolute inset-0 space-y-1 overflow-y-auto p-3 transition-all duration-300 ease-out"
              style={{ transform: subNav ? 'translateX(0)' : 'translateX(100%)', opacity: subNav ? 1 : 0, pointerEvents: subNav ? 'auto' : 'none' }}
            >
              <button type="button" onClick={() => setSubNav(null)}
                className="group/back mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
                <span>{t.sidebar.groupAccount}</span>
              </button>
              {accTabs.map((x, idx) => (
                <div key={x.id} style={{ opacity: subNav ? 1 : 0, transform: subNav ? 'translateX(0)' : 'translateX(16px)', transition: `opacity 280ms ease ${80 + idx * 40}ms, transform 320ms cubic-bezier(0.34,1.56,0.64,1) ${80 + idx * 40}ms` }}>
                  {tabRow(x)}
                </div>
              ))}
            </div>
          </nav>
        )}

        {/* Footer: user + logout */}
        <div className="border-t border-border/60 p-3">
          {col ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: color }} title={me.name || me.email}>
                {initials(me.name, me.email)}
              </div>
              <Button variant="ghost" size="icon" aria-label={t.logout} title={t.logout} onClick={logout} disabled={loggingOut} className="text-muted-foreground">
                {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 flex-col border-r border-border/60 bg-muted/30 transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-64'}`}>
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border/60 bg-background shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label={t.closeMenu} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
            {renderSidebar(false)}
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
            <SiteUserMenu
              name={me.name}
              email={me.email}
              color={color}
              unread={unread}
              base={base}
              onNavigate={openTab}
              onLogout={logout}
              loggingOut={loggingOut}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
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
                    {tab === 'courses' && <CoursesTab siteId={siteId} />}
                    {tab === 'documents' && <DocumentsTab siteId={siteId} />}
                    {tab === 'support' && <SupportTab siteId={siteId} />}
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
  coursesCount: number;
  documentsCount: number;
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
    { id: 'courses', label: t.tabs.courses, value: ov?.coursesCount ?? null, icon: GraduationCap },
    { id: 'documents', label: t.tabs.documents, value: ov?.documentsCount ?? null, icon: FolderOpen },
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

type MCourse = { id: string; title: string; description: string; accent: string; lessonCount: number; completedCount: number; createdAt: string | number | Date };
type MLesson = { id: string; title: string; body: string; videoUrl: string; attachmentUrl: string; completed: boolean };
type MCourseDetail = { id: string; title: string; description: string; accent: string; lessons: MLesson[] };

function ProgressBar({ done, total, accent }: { done: number; total: number; accent?: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <motion.div className="h-full rounded-full" style={{ background: accent || 'var(--primary)' }}
        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
    </div>
  );
}

function CoursesTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const tc = t.courses;
  const [list, setList] = useState<MCourse[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MCourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState('');

  const loadList = useCallback(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=courses`)
      .then((r) => r.json()).then((d) => setList(d.courses ?? [])).catch(() => setList([]));
  }, [siteId]);
  useEffect(() => { loadList(); }, [loadList]);

  const openCourse = (id: string) => {
    setOpenId(id); setDetail(null); setDetailLoading(true);
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=course&id=${encodeURIComponent(id)}`)
      .then((r) => r.json()).then((d) => setDetail(d.course ?? null)).catch(() => setDetail(null)).finally(() => setDetailLoading(false));
  };
  const back = () => { setOpenId(null); setDetail(null); loadList(); };

  const toggle = async (lessonId: string, done: boolean) => {
    setBusy(lessonId);
    const r = await api('lesson-complete', { siteId, lessonId, done }, t.networkError);
    setBusy('');
    if (r.ok) setDetail((d) => d ? { ...d, lessons: d.lessons.map((l) => l.id === lessonId ? { ...l, completed: done } : l) } : d);
  };

  // ── Course detail view ──
  if (openId) {
    const doneCount = detail?.lessons.filter((l) => l.completed).length ?? 0;
    const total = detail?.lessons.length ?? 0;
    const allDone = total > 0 && doneCount === total;
    return (
      <div>
        <button onClick={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {tc.back}
        </button>
        {detailLoading || !detail ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: detail.accent || 'var(--primary)' }}>
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{detail.title || tc.title}</h2>
                  {detail.description && <p className="mt-0.5 text-sm text-muted-foreground">{detail.description}</p>}
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>{tc.progress}</span>
                  <span>{doneCount} / {total} {tc.completedOf}</span>
                </div>
                <ProgressBar done={doneCount} total={total} accent={detail.accent} />
              </div>
              {allDone && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {tc.allDone}
                </div>
              )}
            </div>
            {total === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">{tc.noLessons}</p>
            ) : (
              <ol className="space-y-3">
                {detail.lessons.map((l, i) => (
                  <li key={l.id} className={`rounded-xl border p-4 transition-colors ${l.completed ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-background/60'}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-none text-[11px] font-bold tabular-nums text-muted-foreground">{tc.lesson} {i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">{l.title || `${tc.lesson} ${i + 1}`}</h3>
                        {l.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{l.body}</p>}
                        <div className="mt-2 flex flex-wrap gap-3">
                          {l.videoUrl && (
                            <a href={l.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                              <PlayCircle className="h-4 w-4" /> {tc.watchVideo}
                            </a>
                          )}
                          {l.attachmentUrl && (
                            <a href={l.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                              <LinkIcon className="h-4 w-4" /> {tc.openAttachment}
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(l.id, !l.completed)}
                        disabled={busy === l.id}
                        aria-pressed={l.completed}
                        className={`flex flex-none items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${l.completed ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25' : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                      >
                        {busy === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : l.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        <span className="hidden sm:inline">{l.completed ? tc.done : tc.markDone}</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Course list view ──
  return (
    <div>
      <SectionTitle title={tc.title} desc={tc.desc} />
      {!list ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{tc.empty}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => {
            const pct = c.lessonCount > 0 ? Math.round((c.completedCount / c.lessonCount) * 100) : 0;
            const complete = c.lessonCount > 0 && c.completedCount === c.lessonCount;
            return (
              <li key={c.id}>
                <button onClick={() => openCourse(c.id)} className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: c.accent || 'var(--primary)' }}>
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    {complete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold leading-snug">{c.title || tc.title}</h3>
                    {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{c.completedCount} / {c.lessonCount} {tc.completedOf}</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <ProgressBar done={c.completedCount} total={c.lessonCount} accent={c.accent} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {tc.open} <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type MDoc = { id: string; title: string; fileName: string; url: string; contentType: string; size: number; createdAt: string | number | Date };

function fmtSize(bytes: number): string {
  if (!bytes) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function DocumentsTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const td = t.documents;
  const [items, setItems] = useState<MDoc[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=documents`)
      .then((r) => r.json()).then((d) => setItems(d.documents ?? [])).catch(() => setItems([]));
  }, [siteId]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((m) => `${m.title} ${m.fileName}`.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <div>
      <SectionTitle title={td.title} desc={td.desc} />
      {items && items.length > 0 && (
        <div className="relative mb-4">
          <Search className={iconCls} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.courses.title} className="h-11 pl-10" />
        </div>
      )}
      {!filtered ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{q ? t.nothingFound : td.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileType className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title || m.fileName}</p>
                <p className="truncate text-xs text-muted-foreground">{m.fileName}{m.size ? ` · ${fmtSize(m.size)}` : ''} · {fmtDay(m.createdAt, locale)}</p>
              </div>
              <a href={m.url} target="_blank" rel="noreferrer" download className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                <Download className="h-4 w-4" /> <span className="hidden sm:inline">{td.download}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MTicket = { id: string; subject: string; status: string; lastActor: string; updatedAt: string | number | Date; messageCount: number };
type MTicketMsg = { id: string; authorType: string; body: string; createdAt: string | number | Date };
type MThread = { id: string; subject: string; status: string; messages: MTicketMsg[] };

function SupportTab({ siteId }: { siteId: string }) {
  const locale = useLocale().locale;
  const t = siteAccountDict(locale);
  const ts = t.support;
  const [list, setList] = useState<MTicket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<MThread | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(() => {
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=tickets`)
      .then((r) => r.json()).then((d) => setList(d.tickets ?? [])).catch(() => setList([]));
  }, [siteId]);
  useEffect(() => { loadList(); }, [loadList]);

  const openTicket = (id: string) => {
    setOpenId(id); setThread(null);
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=ticket&id=${encodeURIComponent(id)}`)
      .then((r) => r.json()).then((d) => setThread(d.ticket ?? null)).catch(() => setThread(null));
  };

  const create = async () => {
    if (!subject.trim() && !message.trim()) return;
    setBusy(true);
    await api('ticket-create', { siteId, subject, body: message }, t.networkError);
    setBusy(false); setSubject(''); setMessage(''); setCreating(false); loadList();
  };
  const sendReply = async () => {
    if (!reply.trim() || !openId) return;
    setBusy(true);
    await api('ticket-reply', { siteId, ticketId: openId, body: reply }, t.networkError);
    setBusy(false); setReply(''); openTicket(openId); loadList();
  };

  // ── Thread view ──
  if (openId) {
    return (
      <div>
        <button onClick={() => { setOpenId(null); setThread(null); }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {ts.back}
        </button>
        {!thread ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{thread.subject}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${thread.status === 'open' ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>{thread.status === 'open' ? ts.open : ts.closed}</span>
            </div>
            <ul className="space-y-3">
              {thread.messages.map((m) => {
                const mine = m.authorType === 'member';
                return (
                  <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'border border-border bg-background/60'}`}>
                      <p className={`mb-0.5 text-[11px] font-semibold ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{mine ? ts.you : ts.team} · {fmtDate(m.createdAt, locale)}</p>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {thread.status === 'open' && (
              <div className="mt-4 flex items-end gap-2">
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={ts.replyPh} rows={2}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <Button onClick={sendReply} disabled={busy || !reply.trim()} className="gap-1.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {ts.reply}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><SectionTitle title={ts.title} desc={ts.desc} /></div>
        {!creating && <Button size="sm" className="flex-none gap-1.5" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {ts.create}</Button>}
      </div>
      {creating && (
        <div className="mb-4 space-y-2 rounded-xl border border-border bg-card p-4">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={ts.newSubject} className="h-10" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={ts.newMessage} rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" disabled={busy} onClick={create}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {ts.create}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setSubject(''); setMessage(''); }}>{t.cancel}</Button>
          </div>
        </div>
      )}
      {!list ? (
        <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <LifeBuoy className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{ts.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((tk) => (
            <li key={tk.id}>
              <button onClick={() => openTicket(tk.id)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/60 p-4 text-left transition-colors hover:border-primary/40">
                <MessageSquare className="h-5 w-5 flex-none text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tk.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{tk.lastActor === 'admin' ? ts.team : ts.you} · {fmtDate(tk.updatedAt, locale)}</p>
                </div>
                <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold ${tk.status === 'open' ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>{tk.status === 'open' ? ts.open : ts.closed}</span>
                <ChevronRight className="h-4 w-4 flex-none text-muted-foreground" />
              </button>
            </li>
          ))}
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
