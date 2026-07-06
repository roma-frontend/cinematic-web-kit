'use client';

// Professional dashboard shell: fixed sidebar + sticky topbar on desktop,
// slide-over menu on mobile. Role-aware navigation (customer / admin /
// superadmin). Rendered by app/dashboard/layout.tsx around every page.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Film, LayoutDashboard, Globe, Inbox, UserCircle, Users, LayoutList,
  LogOut, Menu, X, ExternalLink, Crown, ShieldCheck, Plus, Search, Building2, Database,
  ScrollText, KeyRound, Activity, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { CommandPalette, type Command } from '@/components/dashboard/command-palette';
import { IdleTimeout } from '@/components/dashboard/idle-timeout';
import { ActivityTracker } from '@/components/dashboard/activity-tracker';
import { OrgRequestsBadge } from '@/components/dashboard/org-requests-badge';
import { SiteMembersBadge } from '@/components/dashboard/site-members-badge';
import { useLocale } from '@/hooks/use-locale';
import { dashDict } from '@/lib/dashboard-dict';
import { LanguageSwitcher } from '../language-switcher';

export type Role = 'customer' | 'admin' | 'superadmin';
export interface ShellUser { name: string; email: string; role: Role }

type NavKey = 'overview' | 'sites' | 'organization' | 'submissions' | 'account' | 'users' | 'allSites' | 'audit' | 'organizations' | 'database' | 'access' | 'activity' | 'control' | 'studio' | 'trash';
interface NavItem { href: string; key: NavKey; icon: React.ComponentType<{ className?: string }>; staff?: boolean; super?: boolean }

const NAV: NavItem[] = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
  { href: '/dashboard/sites', key: 'sites', icon: Globe },
  { href: '/dashboard/join', key: 'organization', icon: Building2 },
  { href: '/dashboard/submissions', key: 'submissions', icon: Inbox },
  { href: '/dashboard/account', key: 'account', icon: UserCircle },
  { href: '/dashboard/users', key: 'users', icon: Users, staff: true },
  { href: '/dashboard/all-sites', key: 'allSites', icon: LayoutList, staff: true },
  { href: '/dashboard/audit', key: 'audit', icon: ScrollText, staff: true },
  { href: '/dashboard/organizations', key: 'organizations', icon: Building2, super: true },
  { href: '/dashboard/database', key: 'database', icon: Database, super: true },
  { href: '/dashboard/access', key: 'access', icon: KeyRound, super: true },
  { href: '/dashboard/activity', key: 'activity', icon: Activity, super: true },
  { href: '/dashboard/trash', key: 'trash', icon: Trash2, super: true },
  { href: '/dashboard/control', key: 'control', icon: Crown, super: true },
  { href: '/studio', key: 'studio', icon: Film, super: true },
];

// Sidebar sections (hr-project-style grouped nav). Every NAV item falls into
// exactly one group, derived from its role flags.
type NavGroup = 'workspace' | 'staff' | 'super';
const groupOf = (i: NavItem): NavGroup => (i.super ? 'super' : i.staff ? 'staff' : 'workspace');
const GROUP_ORDER: NavGroup[] = ['workspace', 'staff', 'super'];
// Section index (hub) routes — the parent nav items are real, navigable pages.
const HUB: Record<'staff' | 'super', string> = { staff: '/dashboard/staff', super: '/dashboard/super' };

const ROLE_CLS: Record<Role, string> = {
  superadmin: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  admin: 'bg-primary/15 text-primary',
  customer: 'bg-muted text-muted-foreground',
};
const ROLE_ICON: Record<Role, React.ComponentType<{ className?: string }>> = {
  superadmin: Crown,
  admin: ShieldCheck,
  customer: UserCircle,
};

export function DashboardShell({ user, banner, gated, orgRequests = 0, siteMembers = 0, disabled = [], children }: { user: ShellUser; banner?: React.ReactNode; gated?: boolean; orgRequests?: number; siteMembers?: number; disabled?: string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [subNav, setSubNav] = useState<'staff' | 'super' | null>(null);
  const t = dashDict(useLocale().locale);

  // Persist the desktop collapse preference across sessions.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('cwk:sidebar-collapsed') === '1');
    } catch { /* ignore */ }
  }, []);
  // A collapsed rail has no room for the drill-in sub-panel.
  useEffect(() => {
    if (collapsed) setSubNav(null);
  }, [collapsed]);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('cwk:sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const isStaff = user.role === 'admin' || user.role === 'superadmin';
  const disabledSet = new Set(disabled);
  // Gated (no organization yet, awaiting superadmin approval): hide all platform
  // navigation and actions so it's unmistakable there's no dashboard access.
  // Otherwise honour the superadmin's role-access matrix (disabled capabilities
  // hide their nav section for the current, non-superadmin role).
  const visible = gated
    ? []
    : NAV.filter(
        (i) =>
          (i.staff ? isStaff : true) &&
          (i.super ? user.role === 'superadmin' : true) &&
          !disabledSet.has(i.key),
      );
  const active = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const roleMeta = { label: t.roles[user.role], cls: ROLE_CLS[user.role], icon: ROLE_ICON[user.role] };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const commands: Command[] = [
    ...visible.map((i) => ({ label: t.nav[i.key], hint: t.cmd.section, icon: i.icon, run: () => router.push(i.href) })),
    { label: t.cmd.createSite, hint: t.cmd.action, icon: Plus, run: () => router.push('/dashboard/sites') },
    { label: t.cmd.openSite, hint: t.cmd.link, icon: ExternalLink, run: () => window.open('/', '_blank') },
    { label: t.cmd.studio, hint: t.cmd.goto, icon: Film, run: () => router.push('/studio') },
    { label: t.cmd.builder, hint: t.cmd.goto, icon: Film, run: () => router.push('/studio/builder') },
    { label: t.cmd.logout, hint: t.cmd.action, icon: LogOut, run: logout },
  ];

  const renderSidebar = (col: boolean) => {
    const q = col ? '' : query.trim().toLowerCase();
    const matched = q ? visible.filter((i) => t.nav[i.key].toLowerCase().includes(q)) : visible;
    const groupLabel: Record<NavGroup, string> = {
      workspace: t.sidebar.groupWorkspace,
      staff: t.sidebar.groupStaff,
      super: t.sidebar.groupSuper,
    };
    const workspaceItems = visible.filter((i) => groupOf(i) === 'workspace');
    const parents = ([
      { g: 'staff' as const, icon: ShieldCheck },
      { g: 'super' as const, icon: Crown },
    ]).filter((p) => visible.some((i) => groupOf(i) === p.g));
    const subItems = subNav ? visible.filter((i) => groupOf(i) === subNav) : [];

    // One nav row (expanded): left gradient bar + icon scale on the active route.
    const navLink = (item: NavItem) => {
      const on = active(item.href);
      const sup = !!item.super;
      const cls = on
        ? sup ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
        : sup ? 'text-foreground/90 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground';
      return (
        <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
          className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${cls}`}>
          {on && <span className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full ${sup ? 'bg-amber-500' : 'bg-primary'}`} />}
          <item.icon className={`h-4 w-4 shrink-0 transition-transform ${sup ? 'text-amber-500' : ''} ${on ? 'scale-110' : ''}`} />
          <span className="truncate">{t.nav[item.key]}</span>
          {item.href === '/dashboard/organizations' && <OrgRequestsBadge initialCount={orgRequests} />}
          {item.href === '/dashboard/sites' && <SiteMembersBadge initialCount={siteMembers} />}
        </Link>
      );
    };

    return (
      <>
        {/* Header: brand + desktop collapse toggle */}
        <div className={`flex h-16 items-center border-b border-border/60 ${col ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
          {!col && (
            <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
                <Film className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate text-sm font-black tracking-tight">Cinematic Kit</span>
                <span className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t.brandSub}</span>
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

        {/* Section search (expanded, non-gated, main level) */}
        {!col && !gated && !subNav && (
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (e.target.value) setSubNav(null); }}
                placeholder={t.sidebar.search}
                className="w-full rounded-lg border border-border bg-background/60 py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label={t.close} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation: collapsed rail · gated · search results · drill-in */}
        {col ? (
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
            {GROUP_ORDER.map((g, gi) => {
              const items = visible.filter((i) => groupOf(i) === g);
              if (!items.length) return null;
              return (
                <div key={g}>
                  {gi > 0 && <div className="mx-auto my-2 h-px w-8 bg-border/60" />}
                  {items.map((item) => {
                    const on = active(item.href);
                    const sup = !!item.super;
                    const cls = on
                      ? sup ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
                      : sup ? 'text-foreground/90 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground';
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setOpen(false)} title={t.nav[item.key]} aria-label={t.nav[item.key]}
                        className={`group relative my-1 flex items-center justify-center rounded-lg px-2 py-2.5 transition-colors ${cls}`}>
                        {on && <span className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full ${sup ? 'bg-amber-500' : 'bg-primary'}`} />}
                        <item.icon className={`h-4 w-4 shrink-0 transition-transform ${sup ? 'text-amber-500' : ''} ${on ? 'scale-110' : ''}`} />
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        ) : gated ? (
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">{t.gatedNote}</div>
          </nav>
        ) : q ? (
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {matched.length === 0
              ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t.sidebar.noResults}</p>
              : matched.map((item) => navLink(item))}
          </nav>
        ) : (
          <nav className="relative flex-1 overflow-hidden">
            {/* Main level */}
            <div
              className="absolute inset-0 space-y-1 overflow-y-auto p-3 transition-all duration-300 ease-out"
              style={{ transform: subNav ? 'translateX(-100%)' : 'translateX(0)', opacity: subNav ? 0 : 1, pointerEvents: subNav ? 'none' : 'auto' }}
            >
              {workspaceItems.length > 0 && (
                <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{groupLabel.workspace}</p>
              )}
              {workspaceItems.map((item) => navLink(item))}
              {parents.length > 0 && <div className="my-2 h-px bg-border/60" />}
              {parents.map((p) => {
                const hub = HUB[p.g];
                const pOn = active(hub) || visible.some((i) => groupOf(i) === p.g && active(i.href));
                const sup = p.g === 'super';
                const cls = pOn
                  ? sup ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
                  : sup ? 'text-foreground/90 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground';
                return (
                  <div key={p.g} className={`group relative flex items-center rounded-lg text-sm font-medium transition-colors ${cls}`}>
                    {pOn && <span className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full ${sup ? 'bg-amber-500' : 'bg-primary'}`} />}
                    <Link href={hub} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                      <p.icon className={`h-4 w-4 shrink-0 transition-transform ${sup ? 'text-amber-500' : ''} ${pOn ? 'scale-110' : ''}`} />
                      <span className="truncate">{groupLabel[p.g]}</span>
                      {sup && <OrgRequestsBadge initialCount={orgRequests} />}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSubNav(p.g)}
                      aria-label={groupLabel[p.g]}
                      className="flex items-center self-stretch rounded-r-lg px-2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sub level (drill-in) — slides in with a staggered reveal */}
            <div
              className="absolute inset-0 space-y-1 overflow-y-auto p-3 transition-all duration-300 ease-out"
              style={{ transform: subNav ? 'translateX(0)' : 'translateX(100%)', opacity: subNav ? 1 : 0, pointerEvents: subNav ? 'auto' : 'none' }}
            >
              <button type="button" onClick={() => setSubNav(null)}
                className="group/back mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ChevronLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
                <span>{subNav ? groupLabel[subNav] : ''}</span>
              </button>
              {subNav && (() => {
                const hub = HUB[subNav];
                const on = active(hub);
                const sup = subNav === 'super';
                const cls = on
                  ? sup ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
                  : sup ? 'text-foreground/90 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground';
                return (
                  <div style={{ opacity: subNav ? 1 : 0, transform: subNav ? 'translateX(0)' : 'translateX(16px)', transition: `opacity 280ms ease 80ms, transform 320ms cubic-bezier(0.34,1.56,0.64,1) 80ms` }}>
                    <Link href={hub} onClick={() => setOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${cls}`}>
                      {on && <span className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full ${sup ? 'bg-amber-500' : 'bg-primary'}`} />}
                      <LayoutDashboard className={`h-4 w-4 shrink-0 transition-transform ${sup ? 'text-amber-500' : ''} ${on ? 'scale-110' : ''}`} />
                      <span className="truncate">{t.nav.overview}</span>
                    </Link>
                  </div>
                );
              })()}
              {subItems.map((item, idx) => (
                <div
                  key={item.href}
                  style={{
                    opacity: subNav ? 1 : 0,
                    transform: subNav ? 'translateX(0)' : 'translateX(16px)',
                    transition: `opacity 280ms ease ${120 + idx * 40}ms, transform 320ms cubic-bezier(0.34,1.56,0.64,1) ${120 + idx * 40}ms`,
                  }}
                >
                  {navLink(item)}
                </div>
              ))}
            </div>
          </nav>
        )}

        {/* Footer: user + role + logout */}
        <div className="border-t border-border/60 p-3">
          {col ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" title={user.name || user.email}>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <Button variant="ghost" size="icon" aria-label={t.logout} title={t.logout} onClick={logout} className="text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2.5 px-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name || t.noName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="mb-2 px-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleMeta.cls}`}>
                  <roleMeta.icon className="h-3 w-3" /> {roleMeta.label}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={logout}>
                <LogOut className="h-4 w-4" /> {t.logout}
              </Button>
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <CommandPalette commands={commands} />
      <IdleTimeout onLogout={logout} />
      {isStaff && <ActivityTracker />}      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 flex-col border-r border-border/60 bg-muted/30 transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-64'}`}>
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border/60 bg-background shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label={t.close} className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
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
            aria-label={t.menu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight">
            {gated ? t.gatedTitle : (() => {
              if (pathname === HUB.staff) return t.sidebar.groupStaff;
              if (pathname === HUB.super) return t.sidebar.groupSuper;
              const cur = visible.find((i) => active(i.href));
              return cur ? t.nav[cur.key] : t.dashboard;
            })()}
          </span>
          <button
            onClick={() => window.dispatchEvent(new Event('cwk:open-palette'))}
            className={`ml-2 hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted ${gated ? 'md:hidden' : 'md:flex'}`}
          >
            <Search className="h-3.5 w-3.5" /> {t.searchCommands}
            <kbd className="rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {!gated && (
              <>
                <Link href="/dashboard/sites">
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t.newSite}</span></Button>
                </Link>
                <Link href="/" target="_blank" className="hidden sm:block">
                  <Button size="sm" variant="outline" className="gap-1.5">{t.site} <ExternalLink className="h-4 w-4" /></Button>
                </Link>
              </>
            )}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          {banner}
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
