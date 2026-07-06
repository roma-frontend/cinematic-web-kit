import landingData from '@/data/landing.json';
import landingDataEn from '@/data/landing.en.json';
import type { Locale } from '@/lib/seo';

export type LandingCta = {
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
};
export type LandingContent = {
  hero: { badge: string; title: string; subtitle: string; note: string } & LandingCta;
  steps: { title: string; subtitle: string; items: { n: string; title: string; text: string }[] };
  features: { title: string; subtitle: string; items: { title: string; text: string }[] };
  themesTeaser: { title: string; subtitle: string };
  finalCta: { title: string; subtitle: string } & LandingCta;
};

/**
 * The editable landing copy. Russian (data/landing.json) is the source managed
 * from the Studio; English (data/landing.en.json) is the translation. Pass the
 * active locale to render the matching copy.
 */
export function getLanding(locale: Locale = 'ru'): LandingContent {
  return (locale === 'en' ? landingDataEn : landingData) as LandingContent;
}
