'use client';

// Shared login/register UI. Design ported from the Caron project (mesh-orb
// backdrop, glass card, icon inputs, multi-step register wizard with a stepper
// and password-strength meter) and wired to our own SQLite/scrypt auth API
// (/api/auth/login | /api/auth/register). On success → ?next= or /dashboard.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Mail, Lock, User, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Check, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { EMAIL_RE, iconCls, passwordScore, StrengthMeter, Stepper, Shell, Brand } from '@/components/auth/auth-ui';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';

function useAuthSubmit(mode: 'login' | 'register') {
  const router = useRouter();
  const search = useSearchParams();
  const t = authDict(useLocale().locale);
  return async (payload: Record<string, string>): Promise<string | null> => {
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || t.genericError;
      const next = search.get('next');
      router.push(next && next.startsWith('/') ? next : '/dashboard');
      router.refresh();
      return null;
    } catch {
      return t.networkError;
    }
  };
}

const RESEND_COOLDOWN_S = 60;

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const t = authDict(useLocale().locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Second factor: the login API answered otpRequired → show the 6-digit step.
  const [challenge, setChallenge] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const goNext = () => {
    const next = search.get('next');
    router.push(next && next.startsWith('/') ? next : '/dashboard');
    router.refresh();
  };

  const post = async (url: string, payload: Record<string, string>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data } as { ok: boolean; data: Record<string, string> & { otpRequired?: boolean } };
  };

  const submitCreds = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { ok, data } = await post('/api/auth/login', { email, password });
      if (!ok) { setError(data.error || t.genericError); setBusy(false); return; }
      if (data.otpRequired) {
        setChallenge(data.challenge ?? '');
        setMaskedEmail(data.email ?? '');
        setCode('');
        setCooldown(RESEND_COOLDOWN_S);
        setBusy(false);
        return;
      }
      goNext();
    } catch {
      setError(t.networkError);
      setBusy(false);
    }
  };

  const submitCode = async (value?: string) => {
    const otp = value ?? code;
    if (otp.length !== 6 || busy) return;
    setError('');
    setBusy(true);
    try {
      const { ok, data } = await post('/api/auth/login/verify', { challenge, code: otp });
      if (!ok) { setError(data.error || t.genericError); setCode(''); setBusy(false); return; }
      goNext();
    } catch {
      setError(t.networkError);
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setError('');
    try {
      const { ok, data } = await post('/api/auth/login/resend', { challenge });
      if (!ok) { setError(data.error || t.sendCodeError); return; }
      setChallenge(data.challenge ?? challenge);
      setCode('');
      setCooldown(RESEND_COOLDOWN_S);
    } catch {
      setError(t.networkError);
    }
  };

  const backToCreds = () => {
    setChallenge('');
    setCode('');
    setError('');
    setPassword('');
  };

  const otpPhase = Boolean(challenge);

  return (
    <Shell>
      {otpPhase ? (
        <Brand icon={MailCheck} title={t.otpTitle} subtitle={`${t.otpSentTo} ${maskedEmail}`} />
      ) : (
        <Brand title={t.loginTitle} subtitle={t.loginSubtitle} />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!otpPhase ? (
          <motion.div key="creds" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <form onSubmit={submitCreds} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.email}</label>
                <div className="relative">
                  <Mail className={iconCls} />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-11 pl-10" data-testid="login-email" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t.password}</label>
                  <Link href="/forgot-password" data-testid="to-forgot" className="text-xs font-medium text-primary hover:underline">
                    {t.forgot}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className={iconCls} />
                  <Input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="h-11 pl-10 pr-10" data-testid="login-password" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label={t.showPassword}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" data-testid="login-error" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 duration-200 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={busy} size="lg" className="w-full gap-2" data-testid="login-submit">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.signIn}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {t.noAccount}{' '}
              <Link href="/register" data-testid="to-register" className="font-medium text-primary hover:underline">{t.register}</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <form onSubmit={(e) => { e.preventDefault(); void submitCode(); }} className="space-y-4">
              <div className="flex justify-center" data-testid="login-otp">
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={code}
                  onChange={setCode}
                  onComplete={(v: string) => void submitCode(v)}
                  disabled={busy}
                  autoFocus
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {t.otpHint}
              </p>

              {error && (
                <div role="alert" data-testid="login-otp-error" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 duration-200 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={busy || code.length !== 6} size="lg" className="w-full gap-2" data-testid="login-otp-submit">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.verify}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={backToCreds} className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground" data-testid="login-otp-back">
                  <ArrowLeft className="h-3.5 w-3.5" /> {t.back}
                </button>
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={cooldown > 0}
                  className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                  data-testid="login-otp-resend"
                >
                  {cooldown > 0 ? `${t.resendAgain} (${cooldown} ${t.sec})` : t.resendCode}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function RegisterWizard() {
  const submitAuth = useAuthSubmit('register');
  const t = authDict(useLocale().locale);
  const STEP_TITLES = t.stepTitles;
  const STEP_DESCS = t.stepDescs;
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pwScore = useMemo(() => passwordScore(form.password), [form.password]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (s: number): string | null => {
    if (s === 0) {
      if (!form.name.trim()) return t.errNameRequired;
      if (!EMAIL_RE.test(form.email.trim())) return t.errBadEmail;
    }
    if (s === 1) {
      if (form.password.length < 8) return t.errPwShort;
      if (form.password !== form.confirm) return t.errPwMismatch;
    }
    return null;
  };

  const goNext = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError('');
    setDir(1);
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  };
  const goBack = () => { setError(''); setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const finish = async () => {
    for (const s of [0, 1]) { const err = validate(s); if (err) { setError(err); setStep(s); return; } }
    setBusy(true);
    setError('');
    const err = await submitAuth({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    if (err) { setError(err); setBusy(false); }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step < STEP_TITLES.length - 1) goNext();
    else finish();
  };

  return (
    <Shell maxWidth="28rem">
      <Brand title={t.createAccount} />
      <p className="-mt-3 mb-5 text-center text-xs font-medium text-muted-foreground">{t.step} {step + 1} {t.of} {STEP_TITLES.length}</p>
      <Stepper step={step} count={STEP_TITLES.length} />

      <div className="mb-5 text-center">
        <h2 className="text-base font-semibold">{STEP_TITLES[step]}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{STEP_DESCS[step]}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative -mx-1.5 overflow-hidden px-1.5 py-1">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ x: dir * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -40, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.name}</label>
                    <div className="relative">
                      <User className={iconCls} />
                      <Input autoFocus value={form.name} onChange={set('name')} placeholder={t.namePlaceholder} autoComplete="name" className="h-11 pl-10" data-testid="register-name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.email}</label>
                    <div className="relative">
                      <Mail className={iconCls} />
                      <Input type="email" value={form.email} onChange={set('email')} placeholder={t.emailPlaceholder} autoComplete="email" className="h-11 pl-10" data-testid="register-email" />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.password}</label>
                    <div className="relative">
                      <Lock className={iconCls} />
                      <Input autoFocus type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={t.passwordPlaceholderMin} autoComplete="new-password" className="h-11 pl-10 pr-10" data-testid="register-password" />
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
                      <Input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder={t.repeatPlaceholder} autoComplete="new-password" className="h-11 pl-10 pr-10" data-testid="register-confirm" />
                      {form.confirm.length > 0 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {form.confirm === form.password ? <Check className="h-4 w-4 text-green-500" /> : <span className="block h-2 w-2 rounded-full bg-red-500" />}
                        </span>
                      )}
                    </div>
                    {form.confirm.length > 0 && (
                      <p className={`text-xs ${form.confirm === form.password ? 'text-green-600' : 'text-red-500'}`}>
                        {form.confirm === form.password ? t.pwMatch : t.pwNoMatch}
                      </p>
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="truncate font-medium">{form.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-muted-foreground">{t.email}</span>
                    <span className="truncate font-medium">{form.email}</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t.sumNote}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <div role="alert" data-testid="register-error" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 duration-200 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" className="gap-2" onClick={goBack} disabled={busy} data-testid="register-back">
              <ArrowLeft className="h-4 w-4" /> {t.back}
            </Button>
          )}
          {step < STEP_TITLES.length - 1 ? (
            <Button type="submit" size="lg" className="flex-1 gap-2" data-testid="register-next">
              {t.next} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={busy} className="flex-1 gap-2" data-testid="register-submit">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.submit}
            </Button>
          )}
        </div>
      </form>

      {step === 0 && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.haveAccount}{' '}
          <Link href="/login" data-testid="to-login" className="font-medium text-primary hover:underline">
            {t.signIn} <ArrowRight className="inline h-3 w-3" />
          </Link>
        </p>
      )}
    </Shell>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  return mode === 'login' ? <LoginForm /> : <RegisterWizard />;
}
