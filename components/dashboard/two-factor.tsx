'use client';

// Account 2FA enrollment: enable an authenticator app (TOTP) that replaces the
// emailed login code, verify a code to activate, or disable it. Talks to
// /api/auth/2fa.

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';

const DICT = {
  ru: {
    title: 'Двухфакторная аутентификация', on: 'Включена', off: 'Выключена',
    descOff: 'Добавьте приложение-аутентификатор — код из него заменит письмо при входе.',
    descOn: 'При входе запрашивается код из приложения-аутентификатора.',
    enable: 'Включить', disable: 'Выключить', cancel: 'Отмена', verify: 'Подтвердить',
    step: 'Отсканируйте QR или введите ключ вручную в приложении (Google Authenticator и т. п.), затем введите код.',
    key: 'Ключ', code: 'Код из приложения', bad: 'Неверный код, попробуйте снова.', copied: 'Скопировано', err: 'Ошибка',
  },
  en: {
    title: 'Two-factor authentication', on: 'Enabled', off: 'Disabled',
    descOff: 'Add an authenticator app — its code replaces the emailed one at login.',
    descOn: 'Login asks for a code from your authenticator app.',
    enable: 'Enable', disable: 'Disable', cancel: 'Cancel', verify: 'Verify',
    step: 'Scan the QR or add the key manually in your app (Google Authenticator, etc.), then enter a code.',
    key: 'Key', code: 'Code from app', bad: 'Invalid code, try again.', copied: 'Copied', err: 'Error',
  },
  hy: {
    title: 'Երկգործոն նույնականացում', on: 'Միացված', off: 'Անջատված',
    descOff: 'Ավելացրեք authenticator հավելված — դրա կոդը կփոխարինի email-ինը մուտքի ժամանակ։',
    descOn: 'Մուտքի ժամանակ պահանջվում է կոդ authenticator հավելվածից։',
    enable: 'Միացնել', disable: 'Անջատել', cancel: 'Չեղարկել', verify: 'Հաստատել',
    step: 'Սկանավորեք QR-ը կամ ձեռքով ավելացրեք բանալին հավելվածում, ապա մուտքագրեք կոդը։',
    key: 'Բանալի', code: 'Կոդ հավելվածից', bad: 'Սխալ կոդ, փորձեք կրկին։', copied: 'Պատճենված', err: 'Սխալ',
  },
} as const;

export function TwoFactor() {
  const t = DICT[(useLocale().locale as keyof typeof DICT)] ?? DICT.en;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/2fa').then((r) => r.json()).then((d) => setEnabled(Boolean(d.enabled))).catch(() => setErr(t.err));
  }, [t.err]);

  const post = async (body: Record<string, string>) => {
    const res = await fetch('/api/auth/2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  };

  const begin = async () => {
    setBusy(true); setErr('');
    const { ok, data } = await post({ action: 'begin' });
    if (ok) { setSecret(data.secret); setOtpauth(data.otpauth); } else setErr(t.err);
    setBusy(false);
  };

  const verify = async () => {
    if (code.trim().length !== 6 || busy) return;
    setBusy(true); setErr('');
    const { ok } = await post({ action: 'verify', code: code.trim() });
    if (ok) { setEnabled(true); setSecret(''); setOtpauth(''); setCode(''); } else setErr(t.bad);
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true); setErr('');
    const { ok } = await post({ action: 'disable' });
    if (ok) setEnabled(false); else setErr(t.err);
    setBusy(false);
  };

  const copy = () => { navigator.clipboard?.writeText(secret).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };

  const enrolling = Boolean(secret);

  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-card/50 p-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${enabled ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
            {enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
          </span>
          <div>
            <h3 className="font-bold tracking-tight">{t.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{enabled ? t.descOn : t.descOff}</p>
            {enabled !== null && (
              <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${enabled ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                {enabled ? t.on : t.off}
              </span>
            )}
          </div>
        </div>
        {enabled === null ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : enabled ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={disable} className="gap-1.5 text-destructive hover:text-destructive">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />} {t.disable}
          </Button>
        ) : !enrolling ? (
          <Button size="sm" disabled={busy} onClick={begin} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} {t.enable}
          </Button>
        ) : null}
      </div>

      {enrolling && !enabled && (
        <div className="mt-5 space-y-3 border-t border-border/60 pt-5">
          <p className="text-sm text-muted-foreground">{t.step}</p>
          <div>
            <span className="text-xs text-muted-foreground">{t.key}</span>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm">{secret}</code>
              <Button size="sm" variant="ghost" onClick={copy} title={t.copied}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
            <a href={otpauth} className="mt-1 inline-block break-all text-xs text-primary hover:underline">{otpauth}</a>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">{t.code}</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
                placeholder="000000"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-lg tracking-widest outline-none focus:border-primary"
              />
            </div>
            <Button disabled={busy || code.trim().length !== 6} onClick={verify} className="gap-1.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t.verify}
            </Button>
          </div>
        </div>
      )}

      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}
