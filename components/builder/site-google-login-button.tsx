'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';

// "Sign in with Google" for a TENANT site's end-users. The OAuth start/callback
// run on the PLATFORM host (one registered redirect URI for every tenant),
// then a one-time handoff token returns the session to this tenant host. This
// button just links to the platform-host start endpoint, passing the current
// tenant page as the absolute `next` return URL.

/** Absolute origin of the platform host (where OAuth runs). */
function platformOrigin(): string {
  const host = (process.env.NEXT_PUBLIC_APP_HOST || '').trim();
  if (!host) return typeof window !== 'undefined' ? window.location.origin : '';
  if (/^https?:\/\//.test(host)) return host.replace(/\/+$/, '');
  const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export function SiteGoogleLoginButton({ siteId }: { siteId: string }) {
  const t = authDict(useLocale().locale);
  const [enabled, setEnabled] = useState(false);
  const [href, setHref] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/google/status')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => alive && setEnabled(Boolean(d.enabled)))
      .catch(() => alive && setEnabled(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // The tenant page to return to = the current login URL (without any stale
    // ?error/?g_handoff query), resolved on the client to an absolute URL.
    const here = new URL(window.location.href);
    here.searchParams.delete('error');
    here.searchParams.delete('g_handoff');
    const start = `${platformOrigin()}/api/site-auth/google/start?site=${encodeURIComponent(siteId)}&next=${encodeURIComponent(here.toString())}`;
    setHref(start);
  }, [siteId]);

  if (!enabled || !href) return null;

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.telegram.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex items-center gap-3">
        <a
          href={href}
          onClick={() => setBusy(true)}
          aria-disabled={busy}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-md disabled:opacity-60"
          aria-label={t.google.login}
          title={t.google.login}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>Google</span>
        </a>
      </div>
    </div>
  );
}
