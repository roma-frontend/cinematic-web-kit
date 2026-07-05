import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Film, Sparkles, ArrowRight } from 'lucide-react';

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Продукт',
    links: [
      { href: '/studio', label: 'Студия' },
      { href: '/studio/builder', label: 'Конструктор' },
      { href: '/themes', label: 'Темы' },
      { href: '/presets', label: 'Пресеты' },
    ],
  },
  {
    title: 'Аккаунт',
    links: [
      { href: '/register', label: 'Регистрация' },
      { href: '/login', label: 'Войти' },
      { href: '/dashboard', label: 'Мои сайты' },
    ],
  },
  {
    title: 'Ресурсы',
    links: [
      { href: '/dashboard/sites', label: 'Мои сайты' },
      { href: '/vitals', label: 'Web Vitals' },
    ],
  },
];

/** Rich multi-column footer with brand, CTA and grouped navigation. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-14 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand + CTA */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
                <Film className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-sm font-black tracking-tight">Cinematic Kit</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">AI site builder</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Опишите идею — платформа сгенерирует видео и тему, соберёт страницы и опубликует сайт на вашем поддомене.
            </p>
            <Link href="/register" className="mt-5 inline-block">
              <Button size="sm" className="gap-1.5 shadow-lg"><Sparkles className="h-4 w-4" /> Начать бесплатно <ArrowRight className="h-4 w-4" /></Button>
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
          <span>© {new Date().getFullYear()} Cinematic Web Kit. Все права защищены.</span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Собрано на платформе
          </span>
        </div>
      </div>
    </footer>
  );
}
