import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/lib/seo';

/**
 * Resolve the active UI locale (server side) from the NEXT_LOCALE cookie set by
 * the LanguageSwitcher, falling back to the default. Kept dependency-free — a
 * lightweight alternative to a full i18n runtime, sufficient for ru/en.
 */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}
