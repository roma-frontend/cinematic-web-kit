import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, Montserrat } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PrefsSync } from '@/components/prefs-sync';
import { VitalsReporter } from '@/components/vitals-reporter';

import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  KEYWORDS,
  APP_URL,
  OG_LOCALE,
  DEFAULT_LOCALE,
  siteJsonLd,
} from '@/lib/seo';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin', 'cyrillic'], variable: '--font-serif' });
const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'], variable: '--font-grotesk' });

import { getLocale } from '@/lib/i18n';
import { ui } from '@/lib/ui-dict';
import { getCurrentUser } from '@/lib/auth';
import { getUserPrefs } from '@/lib/user-prefs';

// The user's saved light/dark choice lives in the DB (user_prefs.theme) and was
// previously only applied client-side after /api/prefs resolved — so every
// fresh load first painted the `defaultTheme` ("dark") and then flipped to the
// saved theme ~1s later (a jarring dark flash, most visible on heavy client
// pages like the Studio/builder). We now resolve it on the server and feed it
// to next-themes as the default, so the inline theme script paints the correct
// theme on the very first frame. Best-effort: logged-out or DB errors fall back
// to the platform default.
async function initialThemeChoice(): Promise<'light' | 'dark' | 'system'> {
  try {
    const user = await getCurrentUser();
    if (user) {
      const t = getUserPrefs(user.id)['theme'];
      if (t === 'light' || t === 'dark' || t === 'system') return t;
    }
  } catch {
    /* no session / DB unreachable — use the default below */
  }
  return 'light';
}

export async function generateMetadata(): Promise<Metadata> {
  const tagline = ui(await getLocale()).metaTagline;
  const title = `${SITE_NAME} — ${tagline}`;
  return {
  metadataBase: new URL(APP_URL),
  title: {
    default: title,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/',
    title,
    description: DEFAULT_DESCRIPTION,
    locale: OG_LOCALE[DEFAULT_LOCALE],
    alternateLocale: [OG_LOCALE.en, OG_LOCALE.hy],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: { icon: '/icon.svg', apple: '/apple-icon' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  let mediaOrigin: string | null = null;
  try {
    mediaOrigin = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ? new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL).origin : null;
  } catch {
    /* malformed media URL: render normally without a resource hint */
  }
  const initialTheme = await initialThemeChoice();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {mediaOrigin && <link rel="preconnect" href={mediaOrigin} crossOrigin="anonymous" />}
        {mediaOrigin && <link rel="dns-prefetch" href={mediaOrigin} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider disableTransitionOnChange={true} attribute="class" defaultTheme={initialTheme} enableSystem>
          <PrefsSync />
          <VitalsReporter />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
