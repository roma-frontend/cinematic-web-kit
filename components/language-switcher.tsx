'use client';

import { Globe } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { ui } from '@/lib/ui-dict';
import type { Locale } from '@/lib/seo';

const SHORT: Record<Locale, string> = { ru: 'RU', en: 'EN' };

/**
 * Compact RU/EN language toggle. Dependency-free (no i18next): persists the
 * choice via the NEXT_LOCALE cookie and refreshes server components.
 */
export function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();
  const t = ui(locale);
  const next: Locale = locale === 'ru' ? 'en' : 'ru';

  return (
    <button
      type="button"
      onClick={() => changeLocale(next)}
      aria-label={`${t.a11y.language}: ${SHORT[locale]}`}
      title={t.a11y.language}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Globe className="h-4 w-4" />
      {SHORT[locale]}
    </button>
  );
}
