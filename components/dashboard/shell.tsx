'use client';

// Professional dashboard shell: fixed sidebar + sticky topbar on desktop,
// slide-over menu on mobile. Role-aware navigation (customer / admin /
// superadmin). Rendered by app/dashboard/layout.tsx around every page.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Film, LayoutDashboard, Globe, Inbox, UserCircle, Users, LayoutList,
  LogOut, Menu, X, ExternalLink, Crown, ShieldCheck, Plus, Search, Building2, Database,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { CommandPalette, type Command } from '@/components/dashboard/command-palette';

export type Role = 'customer' | 'admin' | 'superadmin';
export interface ShellUser { name: string; email: string; role: Role }

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }>; staff?: boolean; super?: boolean }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Обзор', icon: LayoutDashboard },
  { href: '/dashboard/sites', label: 'Мои сайты', icon: Globe },
  { href: '/dashboard/join', label: 'Организация', icon: Building2 },
  { href: '/dashboard/submissions', label: 'Заявки', icon: Inbox },
  { href: '/dashboard/account', label: 'Аккаунт', icon: UserCircle },
  { href: '/dashboard/users', label: 'Пользователи', icon: Users, staff: true },
  { href: '/dashboard/all-sites', label: 'Все сайты', icon: LayoutList, staff: true },
  { href: '/dashboard/organizations', label: 'Организации', icon: Building2, super: true },
  { href: '/dashboard/database', label: 'База данных', icon: Database, super: true },
  { href: '/dashboard/control', label: 'Центр контроля', icon: Crown, super: true },
];

const ROLE_META: Record<Role, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  superadmin: { label: 'Суперадмин', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: Crown },
  admin: { label: 'Админ', cls: 'bg-primary/15 text-primary', icon: ShieldCheck },
  customer: { label: 'Клиент', cls: 'bg-muted text-muted-foreground', icon: UserCircle },
};

export function DashboardShell({ user, banner, gated, orgRequests = 0, children }: { user: ShellUser; banner?: React.ReactNode; gated?: boolean; orgRequests?: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isStaff = user.role === 'admin' || user.role === 'superadmin';
  // Gated (no organization yet, awaiting superadmin approval): hide all platform
  // navigation and actions so it's unmistakable there's no dashboard access.
  const visible = gated ? [] : NAV.filter((i) => (i.staff ? isStaff : true) && (i.super ? user.role === 'superadmin' : true));
  const active = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const roleMeta = ROLE_META[user.role];

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const commands: Command[] = [
    ...visible.map((i) => ({ label: i.label, hint: 'Раздел', icon: i.icon, run: () => router.push(i.href) })),
    { label: 'Создать новый сайт', hint: 'Действие', icon: Plus, run: () => router.push('/dashboard/sites') },
    { label: 'Открыть сайт', hint: 'Ссылка', icon: ExternalLink, run: () => window.open('/', '_blank') },
    { label: 'Студия', hint: 'Переход', icon: Film, run: () => router.push('/studio') },
    { label: 'Конструктор', hint: 'Переход', icon: Film, run: () => router.push('/studio/builder') },
    { label: 'Выйти из аккаунта', hint: 'Действие', icon: LogOut, run: logout },
  ];

  const SidebarBody = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
            <Film className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-tight">Cinematic Kit</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Dashboard</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {gated && (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            Доступ к разделам откроется после одобрения заявки суперадмином.
          </div>
        )}
        {visible.map((item) => {
          const on = active(item.href);
          if (item.super) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  on ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-gradient-to-r from-amber-500/10 to-primary/10 text-foreground hover:from-amber-500/20 hover:to-primary/20'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">{item.label}</span>
                {item.href === '/dashboard/organizations' && orgRequests > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{orgRequests}</span>
                )}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                on ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.staff && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-500">staff</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name || 'Без имени'}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="mb-2 px-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleMeta.cls}`}>
            <roleMeta.icon className="h-3 w-3" /> {roleMeta.label}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" /> Выйти
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <CommandPalette commands={commands} />      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-muted/30 lg:flex">
        {SidebarBody}
      </aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border/60 bg-background shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label="Закрыть" className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
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
            aria-label="Меню"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight">
            {gated ? 'Доступ ограничен' : (visible.find((i) => active(i.href))?.label ?? 'Дашборд')}
          </span>
          <button
            onClick={() => window.dispatchEvent(new Event('cwk:open-palette'))}
            className={`ml-2 hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted ${gated ? 'md:hidden' : 'md:flex'}`}
          >
            <Search className="h-3.5 w-3.5" /> Поиск команд
            <kbd className="rounded border border-border bg-background px-1 text-[10px]">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {!gated && (
              <>
                <Link href="/dashboard/sites">
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">Новый сайт</span></Button>
                </Link>
                <Link href="/" target="_blank" className="hidden sm:block">
                  <Button size="sm" variant="outline" className="gap-1.5">Сайт <ExternalLink className="h-4 w-4" /></Button>
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {banner}
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
