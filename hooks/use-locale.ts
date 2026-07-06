'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from '@/lib/seo';
import { setPref } from '@/hooks/use-user-prefs';

const LOCALE_EVENT = 'cwk:locale';

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  return isLocale(m?.[1]) ? (m![1] as Locale) : DEFAULT_LOCALE;
}

const subscribeLocale = (cb: () => void) => {
  window.addEventListener(LOCALE_EVENT, cb);
  return () => window.removeEventListener(LOCALE_EVENT, cb);
};

/**
 * Client-side locale state backed by the NEXT_LOCALE cookie — the cookie is the
 * store (useSyncExternalStore), so every hook instance stays in sync and SSR
 * renders the default without a hydration mismatch. `changeLocale` persists the
 * cookie and refreshes server components so locale-aware server content
 * (landing copy, <html lang>) updates.
 */
export function useLocale() {
  const locale = useSyncExternalStore(subscribeLocale, readCookieLocale, () => DEFAULT_LOCALE);
  const router = useRouter();

  const changeLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      window.dispatchEvent(new Event(LOCALE_EVENT));
      setPref('locale', next); // follows the account across browsers
      router.refresh();
    },
    [router],
  );

  return { locale, changeLocale, locales: LOCALES };
}
