'use client';

// Password-recovery UI in the shared auth shell (same glass card as login):
//  - ForgotPasswordForm → POST /api/auth/forgot, always shows the "email sent"
//    state (the API never reveals whether the email exists);
//  - ResetPasswordForm → POST /api/auth/reset with the token from the emailed
//    link, then a success state with a link to /login.

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, ArrowRight, Check, KeyRound, MailCheck, ShieldCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EMAIL_RE, iconCls, passwordScore, StrengthMeter, Shell, Brand } from '@/components/auth/auth-ui';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';

async function post(url: string, payload: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: data.error };
}

export function ForgotPasswordForm() {
  const t = authDict(useLocale().locale);
  const r = t.reset;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError(t.errBadEmail); return; }
    setError('');
    setBusy(true);
    try {
      const { ok, error: err } = await post('/api/auth/forgot', { email: email.trim() });
      if (!ok) { setError(err || t.genericError); setBusy(false); return; }
      setSent(true);
    } catch {
      setError(t.networkError);
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell>
        <Brand icon={MailCheck} title={r.checkEmailTitle} subtitle={r.checkEmailSubtitle.replace('{email}', email.trim())} />
        <p className="text-center text-xs text-muted-foreground" data-testid="forgot-sent">
          {r.checkEmailHint}
        </p>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link href="/login" data-testid="back-to-login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> {r.backToLogin}
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Brand icon={KeyRound} title={r.forgotTitle} subtitle={r.forgotSubtitle} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.email}</label>
          <div className="relative">
            <Mail className={iconCls} />
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email" className="h-11 pl-10" data-testid="forgot-email" />
          </div>
        </div>

        {error && (
          <div role="alert" data-testid="forgot-error" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 duration-200 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <Button type="submit" disabled={busy} size="lg" className="w-full gap-2" data-testid="forgot-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {r.sendLink}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {r.rememberPassword}{' '}
        <Link href="/login" data-testid="to-login" className="font-medium text-primary hover:underline">
          {t.signIn} <ArrowRight className="inline h-3 w-3" />
        </Link>
      </p>
    </Shell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = authDict(useLocale().locale);
  const r = t.reset;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pwScore = useMemo(() => passwordScore(password), [password]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError(t.errPwShort); return; }
    if (password !== confirm) { setError(t.errPwMismatch); return; }
    setError('');
    setBusy(true);
    try {
      const { ok, error: err } = await post('/api/auth/reset', { token, password });
      if (!ok) { setError(err || t.genericError); setBusy(false); return; }
      setDone(true);
    } catch {
      setError(t.networkError);
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell>
        <Brand icon={KeyRound} title={r.invalidTitle} subtitle={r.invalidSubtitle} />
        <Link href="/forgot-password" data-testid="reset-again" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          {r.requestNewLink}
        </Link>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Brand icon={ShieldCheck} title={r.doneTitle} subtitle={r.doneSubtitle} />
        <Link href="/login" data-testid="reset-done" className={cn(buttonVariants({ size: 'lg' }), 'w-full gap-2')}>
          {r.goLogin} <ArrowRight className="h-4 w-4" />
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Brand icon={KeyRound} title={r.newTitle} subtitle={r.newSubtitle} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{r.newPassword}</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input autoFocus type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholderMin} autoComplete="new-password" className="h-11 pl-10 pr-10" data-testid="reset-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label={t.showPassword}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <StrengthMeter score={pwScore} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.repeat}</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input type={showPw ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t.repeatPlaceholder} autoComplete="new-password" className="h-11 pl-10 pr-10" data-testid="reset-confirm" />
            {confirm.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {confirm === password ? <Check className="h-4 w-4 text-green-500" /> : <span className="block h-2 w-2 rounded-full bg-red-500" />}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" data-testid="reset-error" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 duration-200 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <Button type="submit" disabled={busy} size="lg" className="w-full gap-2" data-testid="reset-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {r.savePassword}
        </Button>
      </form>
    </Shell>
  );
}
