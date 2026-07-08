'use client';

import { useEffect, useState } from 'react';
import {
  Send, Loader2, CheckCircle2, XCircle, Bot, KeyRound, MessageSquare,
  ShieldAlert, UserPlus, Rocket, Inbox, Building2, CreditCard, LifeBuoy, RefreshCw, CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/use-locale';
import { telegramDict } from '@/lib/telegram-dict';
import { mediaUrl } from '@/lib/media-url';

type Category = 'registrations' | 'publishes' | 'submissions' | 'orgRequests' | 'subscriptions' | 'tickets' | 'security' | 'dailyDigest';

interface BotInfo { ok: boolean; username?: string; name?: string }
interface Config {
  enabled: boolean;
  configured: boolean;
  hasToken: boolean;
  chatId: string;
  categories: Record<Category, boolean>;
  tokenFromEnv: boolean;
  bot: BotInfo;
}

// Icons per category; user-facing labels/hints come from the i18n dict.
const CATEGORY_ICONS: { id: Category; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'registrations', icon: UserPlus },
  { id: 'publishes', icon: Rocket },
  { id: 'submissions', icon: Inbox },
  { id: 'orgRequests', icon: Building2 },
  { id: 'subscriptions', icon: CreditCard },
  { id: 'tickets', icon: LifeBuoy },
  { id: 'security', icon: ShieldAlert },
  { id: 'dailyDigest', icon: CalendarClock },
];

type Toast = { kind: 'ok' | 'err'; text: string } | null;

export function TelegramSettings() {
  const { locale } = useLocale();
  const t = telegramDict(locale);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [cats, setCats] = useState<Record<Category, boolean>>({} as Record<Category, boolean>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/telegram');
      if (res.ok) {
        const d = (await res.json()) as Config;
        setCfg(d);
        setChatId(d.chatId || '');
        setEnabled(d.enabled);
        setCats(d.categories);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const flash = (t: Toast) => { setToast(t); if (t) setTimeout(() => setToast(null), 4000); };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', token, chatId, enabled, categories: cats }),
      });
      const d = await res.json();
      if (res.ok) {
        setCfg(d);
        setToken(''); // never keep the secret in the field after saving
        flash({ kind: 'ok', text: t.saved });
      } else {
        flash({ kind: 'err', text: d.error || t.saveFailed });
      }
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', token, chatId }),
      });
      const d = await res.json();
      flash(res.ok ? { kind: 'ok', text: t.testSent } : { kind: 'err', text: d.error || t.sendError });
    } finally {
      setTesting(false);
    }
  };

  const toggleCat = (id: Category) => setCats((c) => ({ ...c, [id]: c[id] === false ? true : false }));

  const [digesting, setDigesting] = useState(false);
  const sendDigest = async () => {
    setDigesting(true);
    try {
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'digest' }),
      });
      const d = await res.json();
      flash(res.ok ? { kind: 'ok', text: t.digestSent } : { kind: 'err', text: d.error || t.sendError });
    } finally {
      setDigesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card/50 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connected = cfg?.bot?.ok;

  return (
    <div className="space-y-6">
      {/* Connection status banner */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5 ${
        connected ? 'border-green-500/30 bg-green-500/5' : 'border-border/60 bg-card/50'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl ${connected ? 'bg-green-500/15 text-green-500' : 'bg-muted text-muted-foreground'}`}>
            {connected
              ? /* eslint-disable-next-line @next/next/no-img-element */
                <img src={mediaUrl('/media/bot-avatar.webp')} alt={cfg?.bot?.username ? `@${cfg.bot.username}` : 'bot'} className="h-full w-full object-cover" />
              : <Bot className="h-5.5 w-5.5" />}
          </span>
          <div>
            <div className="flex items-center gap-2 font-bold">
              {connected ? (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> {t.connected}</>
              ) : (
                <><XCircle className="h-4 w-4 text-muted-foreground" /> {t.notConnected}</>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connected
                ? <>@{cfg?.bot?.username} · {cfg?.bot?.name}</>
                : t.connectHint}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <button
              type="button"
              onClick={() => setEnabled((e) => !e)}
              className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
              aria-pressed={enabled}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? 'left-0.5 translate-x-5' : 'left-0.5'}`} />
            </button>
            {enabled ? t.enabled : t.disabled}
          </label>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> {t.refresh}</Button>
        </div>
      </div>

      {/* Credentials */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <KeyRound className="h-4 w-4" /> {t.credentials}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t.botToken}</label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={cfg?.hasToken ? t.tokenSavedPlaceholder : t.tokenPlaceholder}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={cfg?.tokenFromEnv}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {cfg?.tokenFromEnv ? t.tokenFromEnv : t.tokenHint}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t.chatId}</label>
            <Input
              inputMode="numeric"
              placeholder={t.chatIdPlaceholder}
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t.chatIdHint}
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <MessageSquare className="h-4 w-4" /> {t.notifTypes}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORY_ICONS.map(({ id, icon: Icon }) => {
            const on = cats[id] !== false;
            const meta = t.cat[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCat(id)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  on ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-background/40 opacity-70 hover:opacity-100'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{meta.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{meta.hint}</span>
                </span>
                <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4.5 left-0.5' : 'left-0.5'}`} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {t.save}
        </Button>
        <Button variant="outline" onClick={sendTest} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t.sendTest}
        </Button>
        <Button variant="outline" onClick={sendDigest} disabled={digesting} className="gap-2">
          {digesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} {t.reportNow}
        </Button>
        {toast && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
            toast.kind === 'ok' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            {toast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {toast.text}
          </span>
        )}
      </div>
    </div>
  );
}
