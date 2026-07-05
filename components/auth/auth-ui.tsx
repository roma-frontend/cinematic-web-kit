'use client';

// Shared auth UI primitives (design ported from Caron): mesh-orb backdrop, glass
// card, icon inputs, register stepper + password-strength meter. Used by both
// the platform auth (components/auth/auth-form.tsx) and the per-tenant site auth
// (components/builder/site-auth-page.tsx) so they look identical.

import Link from 'next/link';
import { Film, User, Lock, ShieldCheck, Check, type LucideIcon } from 'lucide-react';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const iconCls = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground';

/** 0..4 password-strength score. */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export function StrengthMeter({ score }: { score: number }) {
  const labels = ['', 'слабый', 'средний', 'хороший', 'надёжный'];
  const colors = ['bg-muted', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const textColors = ['text-muted-foreground', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-transparent'}`} style={{ width: i <= score ? '100%' : '0%' }} />
          </div>
        ))}
      </div>
      {score > 0 && <p className={`text-xs ${textColors[score]}`}>Надёжность пароля: {labels[score]}</p>}
    </div>
  );
}

export function Stepper({ step, count }: { step: number; count: number }) {
  const icons = [User, Lock, ShieldCheck];
  return (
    <div className="mb-6 flex items-center">
      {Array.from({ length: count }).map((_, i) => {
        const Icon = icons[i] ?? Check;
        const done = i < step;
        const active = i === step;
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                    ? 'scale-110 border-primary bg-primary/10 text-primary ring-4 ring-primary/15'
                    : 'border-border bg-background text-muted-foreground'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            {i < count - 1 && (
              <div className="mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full bg-primary transition-all duration-500 ${done ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Shell({ children, maxWidth = '26rem' }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="absolute left-[-15%] top-[-20%] h-[600px] w-[600px] rounded-full" style={{ background: 'radial-gradient(circle, var(--primary), transparent 70%)', filter: 'blur(80px)', opacity: 0.4 }} />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle, oklch(0.7 0.17 200), transparent 70%)', filter: 'blur(90px)', opacity: 0.3 }} />
      </div>
      <div className="w-full" style={{ maxWidth }}>
        <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-2xl backdrop-blur-md sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

export function Brand({ title, subtitle, href = '/', label, icon: Icon = Film }: {
  title: string;
  subtitle?: string;
  href?: string;
  label?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      <Link href={href} className="transition-transform hover:scale-105" aria-label={label || title}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
          <Icon className="h-6 w-6" />
        </span>
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
