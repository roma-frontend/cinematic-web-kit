'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';

// Compact social sign-in row for a TENANT site's end-users (Google + Apple).
// OAuth start/callback run on the PLATFORM host (one registered redirect URI
// per provider for every tenant); a one-time handoff token returns the session
// to this tenant host (handled by the login page's g_handoff effect). Each
// button is just a link to the platform-host start endpoint with this page as
// the absolute `next` return URL.

function platformOrigin(): string {
  const host = (process.env.NEXT_PUBLIC_APP_HOST || '').trim();
  if (!host) return typeof window !== 'undefined' ? window.location.origin : '';
  if (/^https?:\/\//.test(host)) return host.replace(/\/+$/, '');
  const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${proto}://${host}`;
}

const iconBtn =
  'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-md disabled:opacity-60';

export function SiteSocialButtons({ siteId }: { siteId: string }) {
  const t = authDict(useLocale().locale);
  const [googleOn, setGoogleOn] = useState(false);
  const [appleOn, setAppleOn] = useState(false);
  const [telegramOn, setTelegramOn] = useState(false);
  const [returnUrl, setReturnUrl] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/google/status').then((r) => (r.ok ? r.json() : { enabled: false })).then((d) => alive && setGoogleOn(Boolean(d.enabled))).catch(() => {});
    fetch('/api/auth/apple/status').then((r) => (r.ok ? r.json() : { enabled: false })).then((d) => alive && setAppleOn(Boolean(d.enabled))).catch(() => {});
    fetch('/api/auth/telegram').then((r) => (r.ok ? r.json() : { botId: null })).then((d) => alive && setTelegramOn(Boolean(d.botId))).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const here = new URL(window.location.href);
    here.searchParams.delete('error');
    here.searchParams.delete('g_handoff');
    setReturnUrl(here.toString());
  }, [siteId]);

  if ((!googleOn && !appleOn && !telegramOn) || !returnUrl) return null;

  const start = (provider: 'google' | 'apple') =>
    `${platformOrigin()}/api/site-auth/${provider}/start?site=${encodeURIComponent(siteId)}&next=${encodeURIComponent(returnUrl)}`;

  // Telegram's Login Widget only works on the BotFather-registered domain (the
  // platform host), so it can't render on the tenant domain. Instead we link to
  // a platform-host page that runs the widget and hands the session back.
  const telegramStart =
    `${platformOrigin()}/site-auth/telegram?site=${encodeURIComponent(siteId)}&next=${encodeURIComponent(returnUrl)}`;

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.telegram.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex items-center gap-3">
        {telegramOn && (
          <a href={telegramStart} className={iconBtn} aria-label={t.telegram.login} title={t.telegram.login}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#229ED9" aria-hidden="true">
              <path d="M21.94 4.6 18.7 19.86c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.29c-.26.26-.49.49-1 .49l.36-5.08 9.24-8.35c.4-.36-.09-.56-.62-.2L6.34 13.07l-4.92-1.54c-1.07-.34-1.09-1.07.22-1.59l19.24-7.42c.89-.33 1.67.2 1.38 1.68z" />
            </svg>
            <span>Telegram</span>
          </a>
        )}
        {googleOn && (
          <a href={start('google')} className={iconBtn} aria-label={t.google.login} title={t.google.login}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Google</span>
          </a>
        )}
        {appleOn && (
          <a href={start('apple')} className={iconBtn} aria-label={t.apple.login} title={t.apple.login}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.46 7.83 1.3 10.39.86 1.25 1.88 2.66 3.22 2.61 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.37.81 1.39-.03 2.27-1.28 3.12-2.54.98-1.46 1.39-2.87 1.41-2.94-.03-.01-2.7-1.04-2.73-4.12zM14.53 4.83c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z" />
            </svg>
            <span>Apple</span>
          </a>
        )}
      </div>
    </div>
  );
}
