'use client';

// Client components for per-tenant end-user auth blocks placed in the builder.
// They read the current site id from context (injected by SiteRenderer) and
// talk to /api/site-auth, which is fully isolated from the platform auth.

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

const SiteAuthContext = createContext<string>('');
export function SiteAuthProvider({ siteId, children }: { siteId: string; children: ReactNode }) {
  return <SiteAuthContext.Provider value={siteId}>{children}</SiteAuthContext.Provider>;
}
const useSiteId = () => useContext(SiteAuthContext);

type PublicUser = { id: string; email: string; name: string };

const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';
const btn = 'inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60';
const wrap = 'mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm';

function useCurrentUser(siteId: string) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!siteId) { setLoading(false); return; }
    let alive = true;
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setUser(d.user ?? null); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [siteId]);
  return { user, setUser, loading };
}

export function SiteAuthForm({ mode, title, submitText, successMsg, showName }: {
  mode: 'login' | 'register';
  title?: string;
  submitText?: string;
  successMsg?: string;
  showName?: boolean;
}) {
  const siteId = useSiteId();
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
        <p className="text-sm text-muted-foreground">Вы вошли как</p>
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
      if (res.ok) { setUser(data.user); setMsg(successMsg || 'Готово.'); }
      else setErr(data.error || 'Ошибка');
    } catch { setErr('Сеть недоступна'); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className={wrap}>
      <h3 className="mb-4 text-lg font-bold tracking-tight">{title || (mode === 'login' ? 'Вход' : 'Регистрация')}</h3>
      <div className="space-y-2.5">
        {mode === 'register' && showName && (
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" autoComplete="name" />
        )}
        <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" required />
        <input className={field} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
        <button className={btn} disabled={busy} type="submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {submitText || (mode === 'login' ? 'Войти' : 'Создать аккаунт')}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
      {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
    </form>
  );
}

export function SiteAccount({ title, logoutText }: { title?: string; logoutText?: string }) {
  const siteId = useSiteId();
  const { user, setUser, loading } = useCurrentUser(siteId);
  const [busy, setBusy] = useState(false);

  if (loading) return <div className={wrap}><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!user) return <div className={wrap}><p className="text-sm text-muted-foreground">Войдите, чтобы увидеть личный кабинет.</p></div>;

  const logout = async () => {
    setBusy(true);
    try {
      await fetch('/api/site-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', siteId }) });
      setUser(null);
    } finally { setBusy(false); }
  };

  return (
    <div className={wrap}>
      <h3 className="mb-3 text-lg font-bold tracking-tight">{title || 'Личный кабинет'}</h3>
      <dl className="space-y-1 text-sm">
        {user.name && <div className="flex gap-2"><dt className="w-20 text-muted-foreground">Имя</dt><dd>{user.name}</dd></div>}
        <div className="flex gap-2"><dt className="w-20 text-muted-foreground">Email</dt><dd>{user.email}</dd></div>
      </dl>
      <button className={`${btn} mt-4`} disabled={busy} onClick={logout}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {logoutText || 'Выйти'}
      </button>
    </div>
  );
}
