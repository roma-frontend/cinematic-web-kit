'use client';

// Per-tenant login / register / account — same construction as the platform
// auth (glass Shell, icon inputs, register stepper), but wired to the isolated
// /api/site-auth (scoped by siteId) and themed with the tenant's own theme.

import { useMemo, useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, User, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EMAIL_RE, iconCls, passwordScore, StrengthMeter, Stepper, Shell, Brand } from '@/components/auth/auth-ui';
import { SiteAccount } from '@/components/builder/site-account';

type Props = { siteId: string; base: string; brand: string; mode: 'login' | 'register' | 'account' };

async function siteAuth(action: string, body: Record<string, string>): Promise<{ ok: boolean; error?: string; user?: unknown; redirect?: string }> {
  try {
    const res = await fetch('/api/site-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.error, user: data.user, redirect: data.redirect };
  } catch {
    return { ok: false, error: 'Сеть недоступна, попробуйте ещё раз.' };
  }
}

function LoginForm({ siteId, base, brand }: Omit<Props, 'mode'>) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const r = await siteAuth('login', { siteId, email, password });
    if (r.redirect) { window.location.assign(r.redirect); return; }
    if (!r.ok) { setError(r.error || 'Не удалось войти'); setBusy(false); return; }
    router.push(`${base}/account`);
    router.refresh();
  };

  return (
    <Shell>
      <Brand title="Вход" subtitle={brand} href={base || '/'} label={brand} icon={Store} />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="relative">
            <Mail className={iconCls} />
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-11 pl-10" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Пароль</label>
          <div className="relative">
            <Lock className={iconCls} />
            <Input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="h-11 pl-10 pr-10" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Показать пароль">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
        <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Войти
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Нет аккаунта? <Link href={`${base}/register`} className="font-medium text-primary hover:underline">Регистрация</Link>
      </p>
    </Shell>
  );
}

const STEP_TITLES = ['Ваши данные', 'Пароль', 'Подтверждение'];
const STEP_DESCS = ['Как к вам обращаться и email для входа', 'Придумайте надёжный пароль', 'Проверьте данные и создайте аккаунт'];

function RegisterWizard({ siteId, base, brand }: Omit<Props, 'mode'>) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pwScore = useMemo(() => passwordScore(form.password), [form.password]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (s: number): string | null => {
    if (s === 0) {
      if (!form.name.trim()) return 'Укажите имя.';
      if (!EMAIL_RE.test(form.email.trim())) return 'Некорректный email.';
    }
    if (s === 1) {
      if (form.password.length < 6) return 'Пароль должен быть не короче 6 символов.';
      if (form.password !== form.confirm) return 'Пароли не совпадают.';
    }
    return null;
  };

  const goNext = () => { const err = validate(step); if (err) { setError(err); return; } setError(''); setDir(1); setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1)); };
  const goBack = () => { setError(''); setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const finish = async () => {
    for (const s of [0, 1]) { const err = validate(s); if (err) { setError(err); setStep(s); return; } }
    setBusy(true); setError('');
    const r = await siteAuth('register', { siteId, name: form.name.trim(), email: form.email.trim(), password: form.password });
    if (!r.ok) { setError(r.error || 'Не удалось зарегистрировать'); setBusy(false); return; }
    router.push(`${base}/account`);
    router.refresh();
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); if (step < STEP_TITLES.length - 1) goNext(); else finish(); };

  return (
    <Shell maxWidth="28rem">
      <Brand title="Регистрация" subtitle={brand} href={base || '/'} label={brand} icon={Store} />
      <p className="-mt-3 mb-5 text-center text-xs font-medium text-muted-foreground">Шаг {step + 1} из {STEP_TITLES.length}</p>
      <Stepper step={step} count={STEP_TITLES.length} />
      <div className="mb-5 text-center">
        <h2 className="text-base font-semibold">{STEP_TITLES[step]}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{STEP_DESCS[step]}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative -mx-1.5 overflow-hidden px-1.5 py-1">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={step} custom={dir} initial={{ x: dir * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="space-y-4">
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Имя</label>
                    <div className="relative">
                      <User className={iconCls} />
                      <Input autoFocus value={form.name} onChange={set('name')} placeholder="Как к вам обращаться" autoComplete="name" className="h-11 pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <div className="relative">
                      <Mail className={iconCls} />
                      <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" className="h-11 pl-10" />
                    </div>
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Пароль</label>
                    <div className="relative">
                      <Lock className={iconCls} />
                      <Input autoFocus type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Минимум 6 символов" autoComplete="new-password" className="h-11 pl-10 pr-10" />
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
                      <Input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder="Ещё раз" autoComplete="new-password" className="h-11 pl-10 pr-10" />
                      {form.confirm.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {form.confirm === form.password ? <Check className="h-4 w-4 text-green-500" /> : <span className="block h-2 w-2 rounded-full bg-red-500" />}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
              {step === 2 && (
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2 py-1"><span className="text-muted-foreground">Имя</span><span className="truncate font-medium">{form.name}</span></div>
                  <div className="flex items-center justify-between gap-2 py-1"><span className="text-muted-foreground">Email</span><span className="truncate font-medium">{form.email}</span></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
        <div className="flex items-center gap-3 pt-2">
          {step > 0 && <Button type="button" variant="outline" size="lg" className="gap-2" onClick={goBack} disabled={busy}><ArrowLeft className="h-4 w-4" /> Назад</Button>}
          {step < STEP_TITLES.length - 1 ? (
            <Button type="submit" size="lg" className="flex-1 gap-2">Далее <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button type="submit" size="lg" disabled={busy} className="flex-1 gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Зарегистрироваться</Button>
          )}
        </div>
      </form>
      {step === 0 && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Уже есть аккаунт? <Link href={`${base}/login`} className="font-medium text-primary hover:underline">Войти <ArrowRight className="inline h-3 w-3" /></Link>
        </p>
      )}
    </Shell>
  );
}

function AccountView({ siteId, base, brand }: Omit<Props, 'mode'>) {
  return <SiteAccount siteId={siteId} base={base} brand={brand} />;
}

export function SiteAuthClient({ siteId, base, brand, mode }: Props) {
  if (mode === 'account') return <AccountView siteId={siteId} base={base} brand={brand} />;
  if (mode === 'register') return <RegisterWizard siteId={siteId} base={base} brand={brand} />;
  return <LoginForm siteId={siteId} base={base} brand={brand} />;
}
