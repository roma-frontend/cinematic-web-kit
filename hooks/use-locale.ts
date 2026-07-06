'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from '@/lib/seo';

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  return isLocale(m?.[1]) ? (m![1] as Locale) : DEFAULT_LOCALE;
}

/**
 * Client-side locale state backed by the NEXT_LOCALE cookie. Initialized to the
 * default (matching SSR) and reconciled to the cookie after mount to avoid a
 * hydration mismatch. `setLocale` persists the cookie and refreshes server
 * components so locale-aware server content (landing copy, <html lang>) updates.
 */
export function useLocale() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const router = useRouter();

  useEffect(() => {
    setLocale(readCookieLocale());
  }, []);

  const changeLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      setLocale(next);
      router.refresh();
    },
    [router],
  );

  return { locale, changeLocale, locales: LOCALES };
}
