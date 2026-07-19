'use client';

// Per-tenant login / register / account — same construction as the platform
// auth (glass Shell, icon inputs, register stepper), but wired to the isolated
// /api/site-auth (scoped by siteId) and themed with the tenant's own theme.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Mail, Lock, User, UserPlus, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Check, Store, MailCheck, KeyRound, ShieldCheck, CreditCard } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { EMAIL_RE, iconCls, passwordScore, StrengthMeter, Stepper, Shell, Brand } from '@/components/auth/auth-ui';
import { SiteAccount } from '@/components/builder/site-account';
import { SiteSocialButtons } from '@/components/builder/site-social-buttons';
import { useLocale } from '@/hooks/use-locale';
import { authDict } from '@/lib/auth-dict';
import { siteRt } from '@/lib/site-runtime-dict';

type Props = { siteId: string; base: string; brand: string; mode: 'login' | 'register' | 'account' | 'reset' };

type SiteAuthResult = {
  ok: boolean;
  error?: string;
  user?: unknown;
  redirect?: string;
  otpRequired?: boolean;
  challenge?: string;
  email?: string;
};
type PublicPlan = {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year';
  perks: string[];
};

async function siteAuth(action: string, body: Record<string, string>, networkError: string): Promise<SiteAuthResult> {
  try {
    const res = await fetch('/api/site-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      error: data.error,
      user: data.user,
      redirect: data.redirect,
      otpRequired: data.otpRequired,
      challenge: data.challenge,
      email: data.email,
    };
  } catch {
    return { ok: false, error: networkError };
  }
}

const RESEND_COOLDOWN_S = 60;

function LoginForm({ siteId, base, brand }: Omit<Props, 'mode'>) {
  const router = useRouter();
  const t = authDict(useLocale().locale);
  const rt = siteRt(useLocale().locale);
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
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Google cross-host handoff: the platform callback returns here with a
  // one-time `g_handoff` token — trade it for a session cookie on this host.
  useEffect(() => {
    let alive = true;
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err && (err.startsWith('google_') || err.startsWith('apple_'))) {
        Promise.resolve().then(() => setError(t.google.failed));
      }
      const token = params.get('g_handoff');
      if (!token) return;
      Promise.resolve().then(() => setBusy(true));
      void siteAuth('google-exchange', { siteId, token }, t.networkError).then((r) => {
        if (!alive) return;
        // Clean the token out of the URL either way.
        const clean = new URL(window.location.href);
        clean.searchParams.delete('g_handoff');
        clean.searchParams.delete('error');
        window.history.replaceState(null, '', clean.toString());
        if (r.ok) { window.location.assign(`${base}/account`); return; }
        setError(r.error || t.google.failed);
        setBusy(false);
      });
    } catch { /* no window */ }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goAccount = () => {
    router.push(`${base}/account`);
    router.refresh();
  };

  const submitCreds = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const r = await siteAuth('login', { siteId, email, password }, t.networkError);
    if (r.redirect) { window.location.assign(r.redirect); return; }
    if (!r.ok) { setError(r.error || rt.loginFailed); setBusy(false); return; }
    if (r.otpRequired) {
      setChallenge(r.challenge ?? '');
      setMaskedEmail(r.email ?? '');
      setCode('');
      setCooldown(RESEND_COOLDOWN_S);
      setBusy(false);
      return;
    }
    goAccount();
  };

  const submitCode = async (value?: string) => {
    const otp = value ?? code;
    if (otp.length !== 6 || busy) return;
    setError(''); setBusy(true);
    const r = await siteAuth('login-verify', { siteId, challenge, code: otp }, t.networkError);
    if (!r.ok) { setError(r.error || rt.loginFailed); setCode(''); setBusy(false); return; }
    goAccount();
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setError('');
    const r = await siteAuth('login-resend', { siteId, challenge }, t.networkError);
    if (!r.ok) { setError(r.error || t.sendCodeError); return; }
    setChallenge(r.challenge ?? challenge);
    setCode('');
    setCooldown(RESEND_COOLDOWN_S);
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
        <Brand title={t.loginTitle} subtitle={brand} href={base || '/'} label={brand} icon={Store} />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {!otpPhase ? (
          <motion.div key="creds" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <form onSubmit={submitCreds} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.email}</label>
                <div className="relative">
                  <Mail className={iconCls} />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email" className="h-11 pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t.password}</label>
                  <Link href={`${base}/reset`} className="text-xs font-medium text-primary hover:underline">{t.forgot}</Link>
                </div>
                <div className="relative">
                  <Lock className={iconCls} />
                  <Input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="h-11 pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label={t.showPassword}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
              <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.signIn}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-muted-foreground">
              {t.noAccount} <Link href={`${base}/register`} className="font-medium text-primary hover:underline">{t.register}</Link>
            </p>
            <SiteSocialButtons siteId={siteId} />
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <form onSubmit={(e) => { e.preventDefault(); void submitCode(); }} className="space-y-4">
              <div className="flex justify-center">
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
              <p className="text-center text-xs text-muted-foreground">{t.otpHint}</p>
              {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
              <Button type="submit" disabled={busy || code.length !== 6} size="lg" className="w-full gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.verify}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={backToCreds} className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> {t.back}
                </button>
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={cooldown > 0}
                  className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
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

const STEP_COUNT = 3;

function RegisterWizard({ siteId, base, brand }: Omit<Props, 'mode'>) {
  const router = useRouter();
  const t = authDict(useLocale().locale);
  const rt = siteRt(useLocale().locale);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pwScore = useMemo(() => passwordScore(form.password), [form.password]);
  // Arrived via an org invite (QR / link) → show a friendly, org-named banner
  // and carry the signed token so the server auto-approves this member.
  const [invited, setInvited] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const tok = p.get('invite');
      if (tok) {
        Promise.resolve().then(() => {
          setInvited(true);
          setInviteToken(tok);
        });
      }
    } catch { /* no window */ }
  }, []);
  useEffect(() => {
    let alive = true;
    fetch(`/api/site-auth?site=${encodeURIComponent(siteId)}&resource=public-plans`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.plans)) setPlans(d.plans as PublicPlan[]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [siteId]);
  const inviteLocale = useLocale().locale;
  const hasPlans = plans.length > 0;
  const inviteText = hasPlans
    ? ({
        ru: `Вы присоединяетесь к организации «${brand}». После регистрации выберите план и оплатите доступ.`,
        en: `You're joining “${brand}”. After registration, choose a plan and pay for access.`,
        hy: `Դուք միանում եք «${brand}»-ին։ Գրանցվելուց հետո ընտրեք պլան և վճարեք մուտքի համար։`,
      } as Record<string, string>)[inviteLocale] ?? ''
    : ({
        ru: `Вы присоединяетесь к организации «${brand}». Зарегистрируйтесь, чтобы отправить заявку на вступление.`,
        en: `You're joining “${brand}”. Sign up to request membership.`,
        hy: `Դուք միանում եք «${brand}»-ին։ Գրանցվեք՝ անդամակցության հայտ ուղարկելու համար։`,
      } as Record<string, string>)[inviteLocale] ?? '';
  const planPreviewText = ({
    ru: { title: 'Планы этой организации', hint: 'Оплата откроется после создания аккаунта. Платёж проходит через защищённый Stripe платформы.' },
    en: { title: 'This organization’s plans', hint: 'Payment opens after account creation. Checkout runs through the platform’s secure Stripe.' },
    hy: { title: 'Այս կազմակերպության պլանները', hint: 'Վճարումը կբացվի հաշիվ ստեղծելուց հետո՝ հարթակի անվտանգ Stripe-ով։' },
  } as Record<string, { title: string; hint: string }>)[inviteLocale] ?? { title: 'Plans', hint: '' };
  const money = (cents: number, cur: string) =>
    new Intl.NumberFormat(inviteLocale === 'hy' ? 'hy-AM' : inviteLocale, { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 2 }).format(cents / 100);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (s: number): string | null => {
    if (s === 0) {
      if (!form.name.trim()) return t.errNameRequired;
      if (!EMAIL_RE.test(form.email.trim())) return t.errBadEmail;
    }
    if (s === 1) {
      if (form.password.length < 6) return rt.pwMin6;
      if (form.password !== form.confirm) return t.errPwMismatch;
    }
    return null;
  };

  const goNext = () => { const err = validate(step); if (err) { setError(err); return; } setError(''); setDir(1); setStep((s) => Math.min(s + 1, STEP_COUNT - 1)); };
  const goBack = () => { setError(''); setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const finish = async () => {
    for (const s of [0, 1]) { const err = validate(s); if (err) { setError(err); setStep(s); return; } }
    setBusy(true); setError('');
    const r = await siteAuth('register', { siteId, name: form.name.trim(), email: form.email.trim(), password: form.password, invite: inviteToken }, t.networkError);
    if (!r.ok) { setError(r.error || rt.registerFailed); setBusy(false); return; }
    router.push(`${base}/account`);
    router.refresh();
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); if (step < STEP_COUNT - 1) goNext(); else finish(); };

  return (
    <Shell maxWidth="28rem">
      <Brand title={t.register} subtitle={brand} href={base || '/'} label={brand} icon={Store} />
      <p className="-mt-3 mb-5 text-center text-xs font-medium text-muted-foreground">{t.step} {step + 1} {t.of} {STEP_COUNT}</p>
      {invited && inviteText && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <UserPlus className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{inviteText}</span>
        </div>
      )}
      {plans.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-start gap-2">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">{planPreviewText.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{planPreviewText.hint}</p>
            </div>
          </div>
          <div className="space-y-2">
            {plans.slice(0, 3).map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="shrink-0 font-semibold">{money(p.amountCents, p.currency)}<span className="text-xs font-normal text-muted-foreground">/{p.interval === 'year' ? 'yr' : 'mo'}</span></span>
                </div>
                {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      <Stepper step={step} count={STEP_COUNT} />
      <div className="mb-5 text-center">
        <h2 className="text-base font-semibold">{t.stepTitles[step]}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t.stepDescs[step]}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative -mx-1.5 overflow-hidden px-1.5 py-1">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={step} custom={dir} initial={{ x: dir * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -40, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }} className="space-y-4">
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.name}</label>
                    <div className="relative">
                      <User className={iconCls} />
                      <Input autoFocus value={form.name} onChange={set('name')} placeholder={t.namePlaceholder} autoComplete="name" className="h-11 pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.email}</label>
                    <div className="relative">
                      <Mail className={iconCls} />
                      <Input type="email" value={form.email} onChange={set('email')} placeholder={t.emailPlaceholder} autoComplete="email" className="h-11 pl-10" />
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
                      <Input autoFocus type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={rt.pwMin6Ph} autoComplete="new-password" className="h-11 pl-10 pr-10" />
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
                      <Input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder={t.repeatPlaceholder} autoComplete="new-password" className="h-11 pl-10 pr-10" />
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
                  <div className="flex items-center justify-between gap-2 py-1"><span className="text-muted-foreground">{t.name}</span><span className="truncate font-medium">{form.name}</span></div>
                  <div className="flex items-center justify-between gap-2 py-1"><span className="text-muted-foreground">{t.email}</span><span className="truncate font-medium">{form.email}</span></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
        <div className="flex items-center gap-3 pt-2">
          {step > 0 && <Button type="button" variant="outline" size="lg" className="gap-2" onClick={goBack} disabled={busy}><ArrowLeft className="h-4 w-4" /> {t.back}</Button>}
          {step < STEP_COUNT - 1 ? (
            <Button type="submit" size="lg" className="flex-1 gap-2">{t.next} <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button type="submit" size="lg" disabled={busy} className="flex-1 gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.submit}</Button>
          )}
        </div>
      </form>
      {step === 0 && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t.haveAccount} <Link href={`${base}/login`} className="font-medium text-primary hover:underline">{t.signIn} <ArrowRight className="inline h-3 w-3" /></Link>
        </p>
      )}
    </Shell>
  );
}

function AccountView({ siteId, base, brand }: Omit<Props, 'mode'>) {
  return <SiteAccount siteId={siteId} base={base} brand={brand} />;
}

// mode 'reset' — served at `${base}/reset`. With a `?token=` (from the emailed
// link) it's a "set a new password" form; without a token it's the "forgot
// password" request form. The token is read client-side from window.location.
function ResetView({ siteId, base, brand }: Omit<Props, 'mode'>) {
  const t = authDict(useLocale().locale);
  const rt = siteRt(useLocale().locale);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
       
      setToken(params.get('token'));
    } catch {
      setToken(null);
    }
    setReady(true);
  }, []);

  // Forgot-password (no token) state
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  // Set-new-password (token) state
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const pwScore = useMemo(() => passwordScore(password), [password]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError(t.errBadEmail); return; }
    setError(''); setBusy(true);
    // Neutral: regardless of the response we show the same confirmation (the
    // API never reveals whether the address exists).
    await siteAuth('forgot', { siteId, email: email.trim() }, t.networkError);
    setSent(true);
    setBusy(false);
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError(rt.pwMin8); return; }
    if (password !== confirm) { setError(t.errPwMismatch); return; }
    setError(''); setBusy(true);
    const r = await siteAuth('reset', { siteId, token: token ?? '', password }, t.networkError);
    if (!r.ok) { setError(r.error || rt.loginFailed); setBusy(false); return; }
    setDone(true);
    setBusy(false);
  };

  if (!ready) {
    return (
      <Shell>
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </Shell>
    );
  }

  // ── Token present: set a new password ──────────────────────────────────
  if (token) {
    if (done) {
      return (
        <Shell>
          <Brand icon={ShieldCheck} title={rt.resetDoneTitle} subtitle={rt.resetDoneSubtitle} href={base || '/'} label={brand} />
          <Link href={`${base}/login`} className={cn(buttonVariants({ size: 'lg' }), 'w-full gap-2')}>
            {t.signIn} <ArrowRight className="h-4 w-4" />
          </Link>
        </Shell>
      );
    }
    return (
      <Shell>
        <Brand icon={KeyRound} title={rt.resetTitle} subtitle={rt.resetSubtitle} href={base || '/'} label={brand} />
        <form onSubmit={submitReset} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{rt.newPassword}</label>
            <div className="relative">
              <Lock className={iconCls} />
              <Input autoFocus type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={rt.pwMin8Ph} autoComplete="new-password" className="h-11 pl-10 pr-10" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" aria-label={t.showPassword}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <StrengthMeter score={pwScore} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{rt.repeatPassword}</label>
            <div className="relative">
              <Lock className={iconCls} />
              <Input type={showPw ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t.repeatPlaceholder} autoComplete="new-password" className="h-11 pl-10 pr-10" />
              {confirm.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {confirm === password ? <Check className="h-4 w-4 text-green-500" /> : <span className="block h-2 w-2 rounded-full bg-red-500" />}
                </span>
              )}
            </div>
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
          <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {rt.savePassword}
          </Button>
        </form>
      </Shell>
    );
  }

  // ── No token: forgot-password request ──────────────────────────────────
  if (sent) {
    return (
      <Shell>
        <Brand icon={MailCheck} title={rt.forgotSentTitle} subtitle={rt.forgotSent} href={base || '/'} label={brand} />
        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link href={`${base}/login`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> {rt.backToLogin}
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Brand icon={KeyRound} title={rt.forgotTitle} subtitle={rt.forgotSubtitle} href={base || '/'} label={brand} />
      <form onSubmit={submitForgot} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.email}</label>
          <div className="relative">
            <Mail className={iconCls} />
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email" className="h-11 pl-10" />
          </div>
        </div>
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}
        <Button type="submit" disabled={busy} size="lg" className="w-full gap-2">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {rt.sendLink}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href={`${base}/login`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> {rt.backToLogin}
        </Link>
      </p>
    </Shell>
  );
}

export function SiteAuthClient({ siteId, base, brand, mode }: Props) {
  if (mode === 'account') return <AccountView siteId={siteId} base={base} brand={brand} />;
  if (mode === 'register') return <RegisterWizard siteId={siteId} base={base} brand={brand} />;
  if (mode === 'reset') return <ResetView siteId={siteId} base={base} brand={brand} />;
  return <LoginForm siteId={siteId} base={base} brand={brand} />;
}
