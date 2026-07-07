import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Blocks, Sparkles, ArrowRight } from 'lucide-react';
import { getLocale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/auth';
import { ui } from '@/lib/ui-dict';

/** Rich multi-column footer with brand, CTA and grouped navigation. */
export async function SiteFooter() {
  const t = ui(await getLocale());
  const me = await getCurrentUser();
  // Signed-in users shouldn't see "sign up / sign in" entry points — swap the
  // Account column and the brand CTA for dashboard-oriented actions.
  const accountLinks = me
    ? [
        { href: '/dashboard', label: t.actions.dashboard },
        { href: '/dashboard/sites', label: t.footer.mySites },
        { href: '/dashboard/account', label: t.actions.account },
      ]
    : [
        { href: '/register', label: t.footer.register },
        { href: '/login', label: t.actions.login },
        { href: '/dashboard', label: t.footer.mySites },
      ];
  const cta = me
    ? { href: '/dashboard', label: t.actions.openDashboard }
    : { href: '/register', label: t.footer.startFree };
  const COLS: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t.footer.product,
      links: [
        { href: '/studio', label: t.nav.studio },
        { href: '/studio/builder', label: t.nav.builder },
        { href: '/themes', label: t.nav.themes },
        { href: '/presets', label: t.nav.presets },
      ],
    },
    {
      title: t.footer.account,
      links: accountLinks,
    },
    {
      title: t.footer.resources,
      links: [
        { href: '/dashboard/sites', label: t.footer.mySites },
        { href: '/vitals', label: 'Web Vitals' },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: '/legal/privacy', label: t.legal.privacy },
        { href: '/legal/terms', label: t.legal.terms },
        { href: '/legal/cookies', label: t.legal.cookies },
        { href: '/legal/acceptable-use', label: t.legal.acceptableUse },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-14 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          {/* Brand + CTA */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
                <Blocks className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-black tracking-tight">Builder Studio</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">AI site builder</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {t.footer.blurb}
            </p>
            <Link href={cta.href} className="mt-5 inline-block">
              <Button size="sm" className="gap-1.5 shadow-lg"><Sparkles className="h-4 w-4" /> {cta.label} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Builder Studio. {t.footer.rights}</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {t.footer.madeOn}
          </span>
        </div>
      </div>
    </footer>
  );
}
