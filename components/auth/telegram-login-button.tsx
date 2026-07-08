'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';

// Telegram Login Widget button (ported from caron's TelegramLoginButton, wired
// to this project's /api/auth/telegram instead of Convex). We avoid Telegram's
// auto-rendered iframe button (whose label can't be localized) and load
// telegram-widget.js only for its `Telegram.Login.auth` API, then trigger the
// popup from our own branded button. The bot's domain must be set in BotFather.

export interface TelegramAuthUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

type TelegramLogin = {
  auth: (
    opts: { bot_id: string | number; request_access?: string | boolean },
    cb: (user: TelegramAuthUser | false) => void,
  ) => void;
};

const SCRIPT_ID = 'telegram-widget-js';

function windowTelegram(): TelegramLogin | undefined {
  return (window as unknown as { Telegram?: { Login?: TelegramLogin } }).Telegram?.Login;
}

export function TelegramLoginButton() {
  const t = authDict(useLocale().locale);
  const router = useRouter();
  const search = useSearchParams();

  const [botId, setBotId] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && !!windowTelegram(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Public numeric bot id (no secret) — null when Telegram login isn't configured.
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/telegram')
      .then((r) => (r.ok ? r.json() : { botId: null }))
      .then((d) => alive && setBotId(d.botId ?? null))
      .catch(() => alive && setBotId(null));
    return () => { alive = false; };
  }, []);

  // Load the widget script once (only for its Login.auth API).
  useEffect(() => {
    if (typeof window === 'undefined' || windowTelegram()) return;
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      return;
    }
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, []);

  const onAuth = useCallback(async (u: TelegramAuthUser) => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: String(u.id),
          first_name: u.first_name,
          last_name: u.last_name,
          username: u.username,
          photo_url: u.photo_url,
          auth_date: String(u.auth_date),
          hash: u.hash,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t.genericError); setBusy(false); return; }
      const next = search.get('next');
      router.push(next && next.startsWith('/') ? next : '/dashboard');
      router.refresh();
    } catch {
      setError(t.networkError);
      setBusy(false);
    }
  }, [router, search, t]);

  const handleClick = () => {
    const login = windowTelegram();
    if (!login || !botId) return;
    login.auth({ bot_id: botId, request_access: 'write' }, (user) => {
      if (user) void onAuth(user);
    });
  };

  if (!botId) return null; // Telegram login not configured

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.telegram.or}
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!scriptReady || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#54a9eb] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#4096d6] hover:shadow-md disabled:opacity-60"
        aria-label={t.telegram.login}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M21.94 4.6 18.7 19.86c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.29c-.26.26-.49.49-1 .49l.36-5.08 9.24-8.35c.4-.36-.09-.56-.62-.2L6.34 13.07l-4.92-1.54c-1.07-.34-1.09-1.07.22-1.59l19.24-7.42c.89-.33 1.67.2 1.38 1.68z" />
          </svg>
        )}
        {busy ? t.telegram.connecting : t.telegram.login}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
