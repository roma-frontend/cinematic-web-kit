'use client';

// Client components for per-tenant end-user auth blocks placed in the builder.
// They read the current site id from context (injected by SiteRenderer) and
// talk to /api/site-auth, which is fully isolated from the platform auth.

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { siteRt } from '@/lib/site-runtime-dict';
import { chromeBtnClass, type ChromeBtnStyles } from '@/lib/builder/chrome-buttons';

const SiteAuthContext = createContext<string>('');
export function SiteAuthProvider({ siteId, children }: { siteId: string; children: ReactNode }) {
  return <SiteAuthContext.Provider value={siteId}>{children}</SiteAuthContext.Provider>;
}
const useSiteId = () => useContext(SiteAuthContext);

/** Auto header/footer auth buttons. Their hrefs are NOT editable in the
 *  builder — they always point at the site's built-in /login and /register
 *  pages, and switch to a «Кабинет» link once the visitor is signed in. Only
 *  their look is configurable (doc.authLoginVariant & co → `styles`). */
export function SiteAuthButtons({ base, styles, stacked = false }: { base: string; styles?: ChromeBtnStyles; stacked?: boolean }) {
  const siteId = useSiteId();
  const t = siteRt(useLocale().locale);
  const { user, loading } = useCurrentUser(siteId);
  const full = stacked ? 'w-full justify-center' : '';
  const outlineCls = chromeBtnClass(styles?.login ?? 'outline', styles?.size, styles?.rounded, full);
  const solidCls = chromeBtnClass(styles?.cta ?? 'default', styles?.size, styles?.rounded, full);

  // Mobile burger: vertical, no fixed slot needed.
  if (stacked) {
    if (loading) return null;
    if (user) return <Link href={`${base}/account`} className={solidCls}>{t.account}</Link>;
    return (
      <div className="flex w-full flex-col gap-2">
        <Link href={`${base}/login`} className={outlineCls}>{t.login}</Link>
        <Link href={`${base}/register`} className={solidCls}>{t.registerFree}</Link>
      </div>
    );
  }

  const actual = loading ? null : user ? (
    <Link href={`${base}/account`} className={solidCls}>{t.account}</Link>
  ) : (
    <>
      <Link href={`${base}/login`} className={outlineCls}>{t.login}</Link>
      <Link href={`${base}/register`} className={solidCls}>{t.registerFree}</Link>
    </>
  );
  // Constant-width slot: an invisible sizer reserves the widest state so the
  // header layout never shifts when auth resolves or when navigating between
  // pages (the actual buttons are overlaid, right-aligned).
  return (
    <div className="relative inline-flex items-center">
      <div className="pointer-events-none invisible flex items-center gap-2" aria-hidden>
        <span className={outlineCls}>{t.login}</span>
        <span className={solidCls}>{t.registerFree}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-end gap-2">{actual}</div>
    </div>
  );
}

type PublicUser = { id: string; email: string; name: string };

const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';
const btn = 'inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60';
const wrap = 'mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm';

// Cross-navigation cache of the tenant auth state so the header buttons don't
// blank out and re-fetch on every page load (which made the header flicker).
// The cache is a subscribable store (useSyncExternalStore below): a login in
// one block instantly updates every other block on the page.
const authCache = new Map<string, PublicUser | null>();
const authListeners = new Set<() => void>();
const notifyAuth = () => authListeners.forEach((l) => l());
const subscribeAuth = (cb: () => void) => {
  authListeners.add(cb);
  return () => { authListeners.delete(cb); };
};
function readAuthCache(siteId: string): PublicUser | null | undefined {
  if (authCache.has(siteId)) return authCache.get(siteId);
  if (typeof window === 'undefined') return undefined;
  try {
    const v = sessionStorage.getItem(`site-auth:${siteId}`);
    if (v != null) { const u = JSON.parse(v) as PublicUser | null; authCache.set(siteId, u); return u; }
  } catch { /* ignore */ }
  return undefined;
}
function writeAuthCache(siteId: string, u: PublicUser | null) {
  authCache.set(siteId, u);
  try { if (typeof window !== 'undefined') sessionStorage.setItem(`site-auth:${siteId}`, JSON.stringify(u)); } catch { /* ignore */ }
  notifyAuth();
}

function useCurrentUser(siteId: string) {
  // `undefined` = not checked yet (spinner); instant paint from a previous
  // check, then the effect revalidates against the server.
  const cached = useSyncExternalStore(
    subscribeAuth,
    () => (siteId ? readAuthCache(siteId) : null),
    () => undefined,
  );
  useEffect(() => {
    if (!siteId) return;
    let alive = true;
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) writeAuthCache(siteId, (d.user ?? null) as PublicUser | null); })
      .catch(() => { if (alive && readAuthCache(siteId) === undefined) writeAuthCache(siteId, null); });
    return () => { alive = false; };
  }, [siteId]);
  const setUser = useCallback((u: PublicUser | null) => writeAuthCache(siteId, u), [siteId]);
  return { user: cached ?? null, setUser, loading: cached === undefined };
}

export function SiteAuthForm({ mode, title, submitText, successMsg, showName }: {
  mode: 'login' | 'register';
  title?: string;
  submitText?: string;
  successMsg?: string;
  showName?: boolean;
}) {
  const siteId = useSiteId();
  const t = siteRt(useLocale().locale);
  const { user, setUser, loading } = useCurrentUser(siteId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (loading) return <div className={wrap}><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (user) {
    return (
      <div className={wrap}>
        <p className="text-sm text-muted-foreground">{t.loggedInAs}</p>
        <p className="font-semibold">{user.name || user.email}</p>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(''); setMsg('');
    try {
      const res = await fetch('/api/site-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, siteId, email, password, name }),
      });
      const data = await res.json();
      if (res.ok) { setUser(data.user); setMsg(successMsg || t.done); }
      else setErr(data.error || t.error);
    } catch { setErr(t.network); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className={wrap}>
      <h3 className="mb-4 text-lg font-bold tracking-tight">{title || (mode === 'login' ? t.loginTitle : t.registerTitle)}</h3>
      <div className="space-y-2.5">
        {mode === 'register' && showName && (
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} autoComplete="name" />
        )}
        <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email} type="email" autoComplete="email" required />
        <input className={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.password} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
        <button className={btn} disabled={busy} type="submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {submitText || (mode === 'login' ? t.login : t.createAccount)}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
    </form>
  );
}

export function SiteAccount({ title, logoutText }: { title?: string; logoutText?: string }) {
  const siteId = useSiteId();
  const t = siteRt(useLocale().locale);
  const { user, setUser, loading } = useCurrentUser(siteId);
  const [busy, setBusy] = useState(false);

  if (loading) return <div className={wrap}><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!user) return <div className={wrap}><p className="text-sm text-muted-foreground">{t.signInToSee}</p></div>;

  const logout = async () => {
    setBusy(true);
    try {
      await fetch('/api/site-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', siteId }) });
      setUser(null);
    } finally { setBusy(false); }
  };

  return (
    <div className={wrap}>
      <h3 className="mb-3 text-lg font-bold tracking-tight">{title || t.accountTitle}</h3>
      <dl className="space-y-1 text-sm">
        {user.name && <div className="flex gap-2"><dt className="w-20 text-muted-foreground">{t.nameLabel}</dt><dd>{user.name}</dd></div>}
        <div className="flex gap-2"><dt className="w-20 text-muted-foreground">{t.email}</dt><dd>{user.email}</dd></div>
      </dl>
      <button className={`${btn} mt-4`} disabled={busy} onClick={logout}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {logoutText || t.logout}
      </button>
    </div>
  );
}
