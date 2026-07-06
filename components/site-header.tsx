'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale } from '@/hooks/use-locale';
import { ui, type UiDict } from '@/lib/ui-dict';
import { Button } from '@/components/ui/button';
import {
  Film, Sparkles, Menu, X, LogIn, LogOut, ChevronDown,
  LayoutDashboard, Globe, UserCircle, Crown, ShieldCheck, Loader2,
} from 'lucide-react';

// App sections — only a superadmin sees these platform links in the top bar.
// Labels are resolved from the active locale's dictionary at render time.
const APP_NAV = [
  { href: '/themes', key: 'themes' },
  { href: '/studio/builder', key: 'builder' },
  { href: '/studio', key: 'studio' },
  { href: '/presets', key: 'presets' },
] as const;

// Landing anchors — shown to guests and non-superadmins; smooth-scroll to sections.
const LANDING_NAV = [
  { href: '/#how', key: 'how' },
  { href: '/#features', key: 'features' },
  { href: '/#themes', key: 'themes' },
  { href: '/#examples', key: 'examples' },
] as const;

type Role = 'customer' | 'admin' | 'superadmin';
interface HeaderUser { name: string; email: string; role: Role }

const ROLE_META: Record<Role, { cls: string; icon: React.ComponentType<{ className?: string }> } | null> = {
  superadmin: { cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: Crown },
  admin: { cls: 'bg-primary/15 text-primary', icon: ShieldCheck },
  customer: null, // clients don't need a badge — the menu is theirs by default
};

const MENU = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/sites', key: 'sites', icon: Globe },
  { href: '/dashboard/account', key: 'account', icon: UserCircle },
] as const;

function Avatar({ user, className = 'h-8 w-8 text-sm' }: { user: HeaderUser; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 font-bold text-primary-foreground shadow-lg shadow-primary/20 ${className}`}>
      {(user.name || user.email).charAt(0).toUpperCase()}
    </span>
  );
}

/** Avatar + dropdown for the signed-in user (desktop). */
function UserMenu({ user, onLogout, busy, t }: { user: HeaderUser; onLogout: () => void; busy: boolean; t: UiDict }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const role = ROLE_META[user.role];
  const roleLabel = user.role === 'superadmin' ? t.roles.superadmin : user.role === 'admin' ? t.roles.admin : '';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition-colors ${
          open ? 'border-primary/40 bg-muted/70' : 'border-border/60 bg-card/60 hover:border-primary/40 hover:bg-muted/70'
        }`}
      >
        <Avatar user={user} />
        <span className="hidden max-w-28 truncate text-sm font-medium lg:block">{user.name || user.email}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
              <Avatar user={user} className="h-10 w-10 text-base" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name || t.header.noName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                {role && (
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${role.cls}`}>
                    <role.icon className="h-3 w-3" /> {roleLabel}
                  </span>
                )}
              </div>
            </div>
            <nav className="p-1.5">
              {MENU.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" /> {t.actions[item.key]}
                </Link>
              ))}
            </nav>
            <div className="border-t border-border/60 p-1.5">
              <button
                role="menuitem"
                onClick={onLogout}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} {t.actions.logout}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Shared sticky top bar: brand, primary navigation, auth actions, responsive menu. */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { locale } = useLocale();
  const t = ui(locale);
  const isActive = (href: string) => !href.includes('#') && (pathname === href || (href !== '/' && pathname?.startsWith(href)));

  // Session probe: `undefined` = still loading (render a skeleton so the
  // header doesn't flash «Войти» at signed-in users), `null` = guest.
  const [user, setUser] = useState<HeaderUser | null | undefined>(undefined);
  const [logoutBusy, setLogoutBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => alive && setUser(d.user ?? null))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, []);

  const logout = async () => {
    setLogoutBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setOpen(false);
      router.refresh();
    } finally {
      setLogoutBusy(false);
    }
  };

  // Platform links are superadmin-only; everyone else gets landing anchors.
  const nav = user?.role === 'superadmin' ? APP_NAV : LANDING_NAV;

  const guestActions = (
    <>
      <Link href="/login">
        <Button variant="ghost" size="sm" className="gap-1.5"><LogIn className="h-4 w-4" /> {t.actions.login}</Button>
      </Link>
      <Link href="/register">
        <Button size="sm" className="gap-1.5 shadow-lg"><Sparkles className="h-4 w-4" /> {t.actions.start}</Button>
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[var(--container-max)] items-center justify-between gap-4 px-6 sm:px-10">
        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <Film className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-tight">Cinematic Kit</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t.header.tagline}</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.nav[item.key]}
              {isActive(item.href) && (
                <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {user === undefined ? (
            <span className="h-10 w-28 animate-pulse rounded-full bg-muted/60" aria-hidden />
          ) : user ? (
            <UserMenu user={user} onLogout={logout} busy={logoutBusy} t={t} />
          ) : (
            guestActions
          )}
        </div>

        {/* Mobile trigger */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? t.a11y.closeMenu : t.a11y.openMenu}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-[var(--container-max)] flex-col gap-1 px-6 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {t.nav[item.key]}
              </Link>
            ))}
            {user ? (
              <div className="mt-2 border-t border-border/60 pt-3">
                <div className="mb-3 flex items-center gap-3 px-1">
                  <Avatar user={user} className="h-10 w-10 text-base" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.name || t.header.noName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/dashboard" onClick={() => setOpen(false)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5"><LayoutDashboard className="h-4 w-4" /> {t.actions.dashboard}</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={logout} disabled={logoutBusy} className="flex-1 gap-1.5 text-red-500 hover:bg-red-500/10 hover:text-red-500">
                    {logoutBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} {t.actions.logout}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex gap-2 border-t border-border/60 pt-3">
                <Link href="/login" onClick={() => setOpen(false)} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5"><LogIn className="h-4 w-4" /> {t.actions.login}</Button>
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="flex-1">
                  <Button size="sm" className="w-full gap-1.5"><Sparkles className="h-4 w-4" /> {t.actions.start}</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
