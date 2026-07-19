'use client';

// ⌘K / Ctrl+K command palette — instant, keyboard-first access to navigation
// and common actions (theme, language, session) from anywhere in the app.
//
// Self-contained by design: a global hotkey + a portaled glass dialog, plus an
// optional header trigger pill. Role-aware — guests see landing anchors and
// auth, signed-in users get their dashboard sections, superadmins also get the
// Studio. All labels come from the shared ui dictionary (ru/en/hy).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Home, LayoutDashboard, Globe, UserCircle, Palette, Layers, CreditCard,
  LogIn, LogOut, Sparkles, Sun, Moon, Languages, Wand2, CornerDownLeft,
} from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { useMounted } from '@/hooks/use-mounted';
import { setPref } from '@/hooks/use-user-prefs';
import { ui } from '@/lib/ui-dict';
import { LOCALES, type Locale } from '@/lib/seo';

export interface PaletteUser {
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'superadmin';
}

interface PaletteItem {
  id: string;
  label: string;
  /** Extra invisible search terms (route, synonyms) so matching stays generous. */
  keywords: string;
  group: 'nav' | 'actions';
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

const LOCALE_NAMES: Record<Locale, string> = { ru: 'Русский', en: 'English', hy: 'Հայերեն' };

/**
 * Rank a query against an item: prefix > substring > subsequence > no match.
 * Cheap on purpose — item lists are tiny, so no fuzzy-matching dependency.
 */
function score(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 100;
  const idx = t.indexOf(q);
  if (idx >= 0) return 60 - Math.min(idx, 40);
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return 10;
  }
  return -1;
}

export function CommandPalette({
  user,
  showTrigger = true,
}: {
  user: PaletteUser | null;
  showTrigger?: boolean;
}) {
  const router = useRouter();
  const { locale, changeLocale } = useLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const t = ui(locale);
  const mounted = useMounted();

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const isMac = mounted && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const close = useCallback(() => setOpen(false), []);
  // Open with a clean slate and remember where keyboard focus should return.
  const openPalette = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActive(0);
    setOpen(true);
  }, []);

  // Global hotkey: ⌘K / Ctrl+K toggles, works on every page the palette is mounted on.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else openPalette();
      }
    };
    // Dashboard and account menus use this event so every entry point opens
    // the same palette instead of mounting competing Ctrl/⌘K dialogs.
    const onOpen = () => openPalette();
    window.addEventListener('keydown', onKey);
    window.addEventListener('cwk:open-palette', onOpen);
    document.body.dataset.commandPaletteReady = 'true';
    Promise.resolve().then(() => setReady(true));
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('cwk:open-palette', onOpen);
      delete document.body.dataset.commandPaletteReady;
      setReady(false);
    };
  }, [openPalette]);

  // While open: focus the input, keep keyboard focus in the dialog and lock scrolling.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', trapFocus);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = prev;
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    };
  }, [open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const items = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [];
    const add = (id: string, label: string, keywords: string, icon: PaletteItem['icon'], href: string) =>
      nav.push({ id, label, keywords: `${keywords} ${href}`, group: 'nav', icon, run: () => go(href) });

    if (user) {
      add('dashboard', t.actions.dashboard, 'dashboard дашборд панель', LayoutDashboard, '/dashboard');
      add('sites', t.actions.sites, 'sites сайты', Globe, '/dashboard/sites');
      add('account', t.actions.account, 'account аккаунт профиль profile', UserCircle, '/dashboard/account');
      if (user.role === 'superadmin') add('studio', t.nav.studio, 'studio студия builder конструктор', Wand2, '/studio');
      add('themes', t.nav.themes, 'themes темы', Palette, '/themes');
      add('presets', t.nav.presets, 'presets пресеты templates шаблоны', Layers, '/presets');
      add('pricing', t.nav.pricing, 'pricing тарифы цены plans', CreditCard, '/pricing');
    } else {
      add('home', t.palette.home, 'home главная landing', Home, '/');
      add('features', t.nav.features, 'features возможности', Sparkles, '/#features');
      add('themes', t.nav.themes, 'themes темы', Palette, '/#themes');
      add('pricing', t.nav.pricing, 'pricing тарифы цены plans', CreditCard, '/pricing');
      add('login', t.actions.login, 'login войти sign in', LogIn, '/login');
      add('register', t.actions.start, 'register регистрация sign up start начать', Sparkles, '/register');
    }

    const actions: PaletteItem[] = [];
    const isDark = resolvedTheme === 'dark';
    actions.push({
      id: 'theme',
      label: isDark ? t.palette.themeLight : t.palette.themeDark,
      keywords: 'theme тема dark light тёмная светлая mode',
      group: 'actions',
      icon: isDark ? Sun : Moon,
      run: () => {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
        setPref('theme', next);
        close();
      },
    });
    for (const l of LOCALES) {
      if (l === locale) continue;
      actions.push({
        id: `lang-${l}`,
        label: `${t.palette.language}: ${LOCALE_NAMES[l]}`,
        keywords: `language язык locale ${l} ${LOCALE_NAMES[l]}`,
        group: 'actions',
        icon: Languages,
        run: () => {
          changeLocale(l);
          close();
        },
      });
    }
    if (user) {
      actions.push({
        id: 'logout',
        label: t.actions.logout,
        keywords: 'logout выйти sign out exit',
        group: 'actions',
        icon: LogOut,
        run: async () => {
          close();
          await fetch('/api/auth/logout', { method: 'POST' });
          router.refresh();
        },
      });
    }
    return [...nav, ...actions];
  }, [user, t, resolvedTheme, locale, go, setTheme, changeLocale, close, router]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((item) => ({ item, s: Math.max(score(query, item.label), score(query, item.keywords)) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ item }) => item);
  }, [items, query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  // Keep the active row visible while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const groups: { key: 'nav' | 'actions'; label: string }[] = [
    { key: 'nav', label: t.palette.navigation },
    { key: 'actions', label: t.palette.actions },
  ];

  // Rows get a flat index across groups so keyboard order matches visual order.
  let flat = -1;

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.palette.open}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-[14vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0); // clamp the highlight to the new result set
                }}
                onKeyDown={onKeyDown}
                placeholder={t.palette.placeholder}
                role="combobox"
                aria-expanded="true"
                aria-controls="cp-list"
                aria-activedescendant={filtered[active] ? `cp-item-${filtered[active].id}` : undefined}
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:block">
                esc
              </kbd>
            </div>

            <div ref={listRef} id="cp-list" role="listbox" className="max-h-[min(20rem,50vh)] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t.palette.noResults}</p>
              )}
              {groups.map(({ key, label }) => {
                const rows = filtered.filter((i) => i.group === key);
                if (rows.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {label}
                    </p>
                    {rows.map((item) => {
                      flat += 1;
                      const idx = flat;
                      const isActive = idx === active;
                      return (
                        <button
                          key={item.id}
                          id={`cp-item-${item.id}`}
                          data-idx={idx}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => item.run()}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                            isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              isActive ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border bg-card/60'
                            }`}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-border/60 bg-muted/30 px-4 py-2 text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5">↑↓</kbd>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-background px-1 py-0.5">↵</kbd>
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" /> Builder Studio
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          data-command-palette-ready={ready ? 'true' : 'false'}
          onClick={openPalette}
          aria-label={t.palette.open}
          title={t.palette.open}
          className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:inline-flex"
        >
          <Search className="h-3.5 w-3.5" />
          <kbd className="rounded border border-border bg-muted px-1 py-px text-[10px] font-semibold">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>
      )}
      {mounted && createPortal(dialog, document.body)}
    </>
  );
}
