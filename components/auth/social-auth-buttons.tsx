'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';

// Compact social sign-in: a single "or" divider followed by a ROW of icon
// buttons (Telegram + Google), instead of stacked full-width buttons. Keeps the
// auth card short. Each provider is gated on its own availability, so the row
// only shows configured options; the divider hides when none are configured.

interface TelegramAuthUser {
  id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string;
}
type TelegramLogin = {
  auth: (opts: { bot_id: string | number; request_access?: string | boolean }, cb: (u: TelegramAuthUser | false) => void) => void;
};
const SCRIPT_ID = 'telegram-widget-js';
const windowTelegram = (): TelegramLogin | undefined =>
  (window as unknown as { Telegram?: { Login?: TelegramLogin } }).Telegram?.Login;

/** Map a ?error=google_* code to a localized message. */
function googleError(code: string | null, g: ReturnType<typeof authDict>['google']): string | null {
  switch (code) {
    case 'google_not_configured': return g.notConfigured;
    case 'google_cancelled': return g.cancelled;
    case 'google_no_email': return g.noEmail;
    case 'google_unverified_email': return g.unverified;
    case 'google_suspended': return g.suspended;
    case 'google_bad_request':
    case 'google_state_mismatch':
    case 'google_exchange_failed': return g.failed;
    default: return null;
  }
}

/** Map a ?error=apple_* code to a localized message. */
function appleError(code: string | null, a: ReturnType<typeof authDict>['apple']): string | null {
  switch (code) {
    case 'apple_not_configured': return a.notConfigured;
    case 'apple_cancelled': return a.cancelled;
    case 'apple_no_email': return a.noEmail;
    case 'apple_suspended': return a.suspended;
    case 'apple_bad_request':
    case 'apple_state_mismatch':
    case 'apple_exchange_failed': return a.failed;
    default: return null;
  }
}

const iconBtn =
  'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-md disabled:opacity-60 disabled:hover:translate-y-0';

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#229ED9" aria-hidden="true">
      <path d="M21.94 4.6 18.7 19.86c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.29c-.26.26-.49.49-1 .49l.36-5.08 9.24-8.35c.4-.36-.09-.56-.62-.2L6.34 13.07l-4.92-1.54c-1.07-.34-1.09-1.07.22-1.59l19.24-7.42c.89-.33 1.67.2 1.38 1.68z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.46 7.83 1.3 10.39.86 1.25 1.88 2.66 3.22 2.61 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.37.81 1.39-.03 2.27-1.28 3.12-2.54.98-1.46 1.39-2.87 1.41-2.94-.03-.01-2.7-1.04-2.73-4.12zM14.53 4.83c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z" />
    </svg>
  );
}

export function SocialAuthButtons() {
  const t = authDict(useLocale().locale);
  const router = useRouter();
  const search = useSearchParams();

  const [botId, setBotId] = useState<string | null>(null);
  const [googleOn, setGoogleOn] = useState(false);
  const [appleOn, setAppleOn] = useState(false);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== 'undefined' && !!windowTelegram());
  const [busy, setBusy] = useState<'telegram' | 'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  // Availability probes (both public, no secrets).
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/telegram').then((r) => (r.ok ? r.json() : { botId: null })).then((d) => alive && setBotId(d.botId ?? null)).catch(() => {});
    fetch('/api/auth/google/status').then((r) => (r.ok ? r.json() : { enabled: false })).then((d) => alive && setGoogleOn(Boolean(d.enabled))).catch(() => {});
    fetch('/api/auth/apple/status').then((r) => (r.ok ? r.json() : { enabled: false })).then((d) => alive && setAppleOn(Boolean(d.enabled))).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Surface a Google/Apple callback error from the URL.
  useEffect(() => {
    const code = search.get('error');
    const msg = googleError(code, t.google) ?? appleError(code, t.apple);
    if (msg) Promise.resolve().then(() => setError(msg));
  }, [search, t]);

  // Load the Telegram widget script once (only when Telegram is available).
  useEffect(() => {
    if (!botId || typeof window === 'undefined' || windowTelegram()) return;
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => setScriptReady(true)); return; }
    const s = document.createElement('script');
    s.id = SCRIPT_ID; s.src = 'https://telegram.org/js/telegram-widget.js?22'; s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, [botId]);

  const onTelegramAuth = useCallback(async (u: TelegramAuthUser) => {
    setError(''); setBusy('telegram');
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(u.id), first_name: u.first_name, last_name: u.last_name, username: u.username, photo_url: u.photo_url, auth_date: String(u.auth_date), hash: u.hash }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t.genericError); setBusy(null); return; }
      const next = search.get('next');
      router.push(next && next.startsWith('/') ? next : '/dashboard');
      router.refresh();
    } catch { setError(t.networkError); setBusy(null); }
  }, [router, search, t]);

  const clickTelegram = () => {
    const login = windowTelegram();
    if (!login || !botId) return;
    login.auth({ bot_id: botId, request_access: 'write' }, (user) => { if (user) void onTelegramAuth(user); });
  };

  const next = search.get('next');
  const googleHref = `/api/auth/google/start${next && next.startsWith('/') ? `?next=${encodeURIComponent(next)}` : ''}`;
  const appleHref = `/api/auth/apple/start${next && next.startsWith('/') ? `?next=${encodeURIComponent(next)}` : ''}`;

  if (!botId && !googleOn && !appleOn) return null;

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.telegram.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex items-center gap-3">
        {botId && (
          <button type="button" onClick={clickTelegram} disabled={!scriptReady || busy !== null} className={iconBtn} aria-label={t.telegram.login} title={t.telegram.login}>
            {busy === 'telegram' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TelegramIcon />}
            <span className="hidden sm:inline">Telegram</span>
          </button>
        )}
        {googleOn && (
          <a href={googleHref} onClick={() => setBusy('google')} aria-disabled={busy !== null} className={iconBtn} aria-label={t.google.login} title={t.google.login}>
            {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            <span className="hidden sm:inline">Google</span>
          </a>
        )}
        {appleOn && (
          <a href={appleHref} onClick={() => setBusy('apple')} aria-disabled={busy !== null} className={iconBtn} aria-label={t.apple.login} title={t.apple.login}>
            {busy === 'apple' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />}
            <span className="hidden sm:inline">Apple</span>
          </a>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
