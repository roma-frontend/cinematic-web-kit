'use client';

// Applies account-level preferences (theme, locale) once after they arrive
// from the DB, so a user who signs in on a new browser immediately gets their
// saved look. Renders nothing; mounted once in the root layout. Writes go the
// other way through ThemeToggle / useLocale, which call setPref() on change.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { usePrefs } from '@/hooks/use-user-prefs';
import { isLocale, LOCALE_COOKIE } from '@/lib/seo';

function cookieLocale(): string {
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  return m?.[1] ?? '';
}

export function PrefsSync() {
  const prefs = usePrefs();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const applied = useRef(false);

  useEffect(() => {
    if (!prefs || applied.current) return;
    applied.current = true;

    const savedTheme = prefs['theme'];
    if ((savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') && savedTheme !== theme) {
      setTheme(savedTheme);
    }

    const savedLocale = prefs['locale'];
    if (typeof savedLocale === 'string' && isLocale(savedLocale) && savedLocale !== cookieLocale()) {
      document.cookie = `${LOCALE_COOKIE}=${savedLocale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = savedLocale;
      router.refresh();
    }
  }, [prefs, theme, setTheme, router]);

  return null;
}
