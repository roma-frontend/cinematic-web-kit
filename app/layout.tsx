import type { Metadata } from 'next';
import { Inter, Playfair_Display, Montserrat } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@/components/analytics';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin', 'cyrillic'], variable: '--font-serif' });
const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'], variable: '--font-grotesk' });

export const metadata: Metadata = {
  title: 'Cinematic Web Kit',
  description: 'Build modern web projects with AI-generated cinematic video sections.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} ${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
