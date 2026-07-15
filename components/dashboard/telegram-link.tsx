'use client';

// Account setting: link/unlink a Telegram identity to THIS platform account.
// Because Telegram provides no email, this explicit linking is what makes
// Telegram sign-in resolve to the same account as an email/Google/Apple login —
// so a subscription bought under this account is recognized after a Telegram
// sign-in. Talks to /api/account/telegram; uses the Telegram Login Widget only
// for its verified auth payload (same as the login button).

import { useCallback, useEffect, useState } from 'react';
import { Send, Loader2, Link2, Link2Off, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';

interface TelegramAuthUser {
  id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string;
}
type TelegramLogin = { auth: (o: { bot_id: string | number; request_access?: string | boolean }, cb: (u: TelegramAuthUser | false) => void) => void };
const SCRIPT_ID = 'telegram-widget-js';
const windowTelegram = (): TelegramLogin | undefined => (window as unknown as { Telegram?: { Login?: TelegramLogin } }).Telegram?.Login;

const DICT = {
  ru: {
    title: 'Вход через Telegram', linked: 'Привязан', notLinked: 'Не привязан',
    descOff: 'Привяжите Telegram, чтобы входить им в этот же аккаунт (подписка и данные сохранятся).',
    descOn: 'Вход через Telegram ведёт в этот аккаунт.',
    link: 'Привязать', unlink: 'Отвязать', connecting: 'Подключение…',
    taken: 'Этот Telegram уже привязан к другому аккаунту.',
    expired: 'Срок авторизации истёк, попробуйте снова.', bad: 'Проверка Telegram не пройдена.',
    notConfigured: 'Вход через Telegram не настроен.', err: 'Ошибка, попробуйте снова.',
  },
  en: {
    title: 'Telegram sign-in', linked: 'Linked', notLinked: 'Not linked',
    descOff: 'Link Telegram so signing in with it lands on this same account (your subscription and data are kept).',
    descOn: 'Signing in with Telegram lands on this account.',
    link: 'Link', unlink: 'Unlink', connecting: 'Connecting…',
    taken: 'This Telegram is already linked to another account.',
    expired: 'Authorization expired, please try again.', bad: 'Telegram verification failed.',
    notConfigured: 'Telegram sign-in is not configured.', err: 'Something went wrong, try again.',
  },
  hy: {
    title: 'Մուտք Telegram-ով', linked: 'Կապված է', notLinked: 'Կապված չէ',
    descOff: 'Կապեք Telegram-ը, որպեսզի դրանով մուտքը տանի նույն հաշիվ (բաժանորդագրությունն ու տվյալները պահպանվեն)։',
    descOn: 'Telegram-ով մուտքը տանում է այս հաշիվ։',
    link: 'Կապել', unlink: 'Անջատել', connecting: 'Միանում…',
    taken: 'Այս Telegram-ն արդեն կապված է մեկ այլ հաշվի հետ։',
    expired: 'Վավերացման ժամկետը լրացել է, փորձեք կրկին։', bad: 'Telegram-ի ստուգումը ձախողվեց։',
    notConfigured: 'Telegram-ով մուտքը կարգավորված չէ։', err: 'Սխալ, փորձեք կրկին։',
  },
} as const;

export function TelegramLink() {
  const t = DICT[(useLocale().locale as keyof typeof DICT)] ?? DICT.en;
  const [botId, setBotId] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== 'undefined' && !!windowTelegram());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/account/telegram').then((r) => r.json()).then((d) => {
      setConfigured(Boolean(d.configured)); setLinked(Boolean(d.linked)); setUsername(d.username ?? null);
    }).catch(() => setConfigured(false));
    fetch('/api/auth/telegram').then((r) => (r.ok ? r.json() : { botId: null })).then((d) => setBotId(d.botId ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!botId || typeof window === 'undefined' || windowTelegram()) return;
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', () => setScriptReady(true)); return; }
    const s = document.createElement('script');
    s.id = SCRIPT_ID; s.src = 'https://telegram.org/js/telegram-widget.js?22'; s.async = true;
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, [botId]);

  const onAuth = useCallback(async (u: TelegramAuthUser) => {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/account/telegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(u.id), first_name: u.first_name, last_name: u.last_name, username: u.username, photo_url: u.photo_url, auth_date: String(u.auth_date), hash: u.hash }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error === 'telegram_taken' ? t.taken : data.error === 'expired' ? t.expired : data.error === 'bad_signature' ? t.bad : data.error === 'not_configured' ? t.notConfigured : t.err);
        setBusy(false); return;
      }
      setLinked(true); setUsername(data.username ?? null); setBusy(false);
    } catch { setErr(t.err); setBusy(false); }
  }, [t]);

  const link = () => {
    const login = windowTelegram();
    if (!login || !botId) return;
    login.auth({ bot_id: botId, request_access: 'write' }, (user) => { if (user) void onAuth(user); });
  };

  const unlink = async () => {
    setErr(''); setBusy(true);
    try {
      const res = await fetch('/api/account/telegram', { method: 'DELETE' });
      if (!res.ok) { setErr(t.err); setBusy(false); return; }
      setLinked(false); setUsername(null); setBusy(false);
    } catch { setErr(t.err); setBusy(false); }
  };

  // Hidden entirely when Telegram isn't configured on the platform.
  if (configured === false || !botId) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-card/50 p-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${linked ? 'bg-[#229ED9]/15 text-[#229ED9]' : 'bg-muted text-muted-foreground'}`}>
            <Send className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold tracking-tight">{t.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{linked ? t.descOn : t.descOff}</p>
            {configured !== null && (
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${linked ? 'bg-[#229ED9]/15 text-[#229ED9]' : 'bg-muted text-muted-foreground'}`}>
                {linked ? <><Check className="h-3 w-3" /> {t.linked}{username ? ` · @${username}` : ''}</> : t.notLinked}
              </span>
            )}
          </div>
        </div>
        {configured === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : linked ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={unlink} className="gap-1.5 text-destructive hover:text-destructive">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />} {t.unlink}
          </Button>
        ) : (
          <Button size="sm" disabled={busy || !scriptReady} onClick={link} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} {busy ? t.connecting : t.link}
          </Button>
        )}
      </div>
      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
