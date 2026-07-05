import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Film, Sparkles } from 'lucide-react';

/** Shared sticky top bar with primary navigation. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[var(--container-max)] items-center justify-between px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Film className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Кинематографический кит</span>
          <span className="sm:hidden">Кит</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/presets">
            <Button variant="ghost" size="sm">Пресеты</Button>
          </Link>
          <Link href="/vitals">
            <Button variant="ghost" size="sm">Vitals</Button>
          </Link>
          <ThemeToggle />
          <Link href="/studio">
            <Button size="sm" className="gap-1.5 shadow-lg"><Sparkles className="h-4 w-4" /> Студия</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
