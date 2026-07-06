import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, Montserrat } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PrefsSync } from '@/components/prefs-sync';
import { Analytics } from '@/components/analytics';
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
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
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
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider disableTransitionOnChange={true} attribute="class" defaultTheme="dark" enableSystem>
          <PrefsSync />
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
