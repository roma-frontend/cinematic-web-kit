'use client';

// Password-recovery UI in the shared auth shell (same glass card as login):
//  - ForgotPasswordForm → POST /api/auth/forgot, always shows the "письмо
//    отправлено" state (the API never reveals whether the email exists);
//  - ResetPasswordForm → POST /api/auth/reset with the token from the emailed
//    link, then a success state with a link to /login.

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft, ArrowRight, Check, KeyRound, MailCheck, ShieldCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { EMAIL_RE, iconCls, passwordScore, StrengthMeter, Shell, Brand } from '@/components/auth/auth-ui';

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
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError('Некорректный email.'); return; }
    setError('');
    setBusy(true);
    try {
      const { ok, error: err } = await post('/api/auth/forgot', { email: email.trim() });
      if (!ok) { setError(err || 'Что-то пошло не так.'); setBusy(false); return; }
      setSent(true);
    } catch {
      setError('Сеть недоступна, попробуйте ещё раз.');
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell>
        <Brand icon={MailCheck} title="Проверьте почту" subtitle={`Если аккаунт с адресом ${email.trim()} существует, мы отправили на него ссылку для сброса пароля.`} />
        <p className="text-center text-xs text-muted-foreground" data-testid="forgot-sent">
          Ссылка действует 60 минут. Не пришло письмо — проверьте «Спам».
        </p>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link href="/login" data-testid="back-to-login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Вернуться ко входу
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Brand icon={KeyRound} title="Восстановление пароля" subtitle="Укажите email — мы отправим ссылку для сброса" />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="relative">
            <Mail className={iconCls} />
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-11 pl-10" data-testid="forgot-email" />
          </div>
        </div>

        {error && (
          <div role="alert" data-testid="forgot-error" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 duration-200 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <Button type="submit" disabled={busy} size="lg" className="w-full gap-2" data-testid="forgot-submit">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Отправить ссылку
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Вспомнили пароль?{' '}
        <Link href="/login" data-testid="to-login" className="font-medium text-primary hover:underline">
          Войти <ArrowRight className="inline h-3 w-3" />
        </Link>
      </p>
    </Shell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pwScore = useMemo(() => passwordScore(password), [password]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Пароль должен быть не короче 8 символов.'); return; }
    if (password !== confirm) { setError('Пароли не совпадают.'); return; }
    setError('');
    setBusy(true);
    try {
      const { ok, error: err } = await post('/api/auth/reset', { token, password });
      if (!ok) { setError(err || 'Что-то пошло не так.'); setBusy(false); return; }
      setDone(true);
    } catch {
      setError('Сеть недоступна, попробуйте ещё раз.');
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell>
        <Brand icon={KeyRound} title="Ссылка недействительна" subtitle="В адресе нет токена сброса. Запросите новую ссылку." />
        <Link href="/forgot-password" data-testid="reset-again" className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
          Запросить новую ссылку
        </Link>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Brand icon={ShieldCheck} title="Пароль обновлён" subtitle="Теперь войдите с новым паролем. Все старые сессии завершены." />
        <Link href="/login" data-testid="reset-done" className={cn(buttonVariants({ size: 'lg' }), 'w-full gap-2')}>
          Войти <ArrowRight className="h-4 w-4" />
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Brand icon={KeyRound} title="Новый пароль" subtitle="Придумайте новый надёжный пароль для аккаунта" />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Новый пароль</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input autoFocus type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 8 символов" autoComplete="new-password" className="h-11 pl-10 pr-10" data-testid="reset-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Показать пароль">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <StrengthMeter score={pwScore} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Повторите пароль</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input type={showPw ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ещё раз" autoComplete="new-password" className="h-11 pl-10 pr-10" data-testid="reset-confirm" />
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
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Сохранить пароль
        </Button>
      </form>
    </Shell>
  );
}
