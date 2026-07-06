import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { ThemeStyle } from '@/components/theme-style';
import { ThemeFX } from '@/components/theme-fx';
import { siteTheme } from '@/lib/site-theme';
import { LayoutTemplate, ArrowRight, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Пресеты страниц — Кинематографический кит',
  description: 'Готовые шаблоны страниц, собранные из кинематографических блоков.',
};

const PRESETS = [
  {
    href: '/presets/product',
    title: 'Продукт',
    desc: 'Лендинг продукта: hero, split-hero, до/после, sticky-история, мозаика и каталог.',
    blocks: ['VideoHero', 'SplitHero', 'BeforeAfter', 'StickyShowcase', 'VideoMosaic'],
  },
  {
    href: '/presets/portfolio',
    title: 'Портфолио',
    desc: 'Витрина работ на мозаике с крупными акцентными плитками и блоком о процессе.',
    blocks: ['SplitHero', 'VideoMosaic', 'VideoCardGrid'],
  },
  {
    href: '/presets/story',
    title: 'История бренда',
    desc: 'Полноэкранный сторителлинг: sticky-главы поверх клипа и видеополоса-манифест.',
    blocks: ['VideoHero', 'StickyShowcase', 'VideoSection'],
  },
];

/**
 * The real preset page rendered small: a desktop-width iframe scaled to 1/4.
 * It is purely decorative here — hidden from AT and keyboard, clicks fall
 * through to the card link.
 */
function LivePreview({ href, title }: { href: string; title: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-muted">
      <iframe
        src={href}
        title={`Превью: ${title}`}
        aria-hidden
        tabIndex={-1}
        loading="lazy"
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 select-none"
        style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left', border: 0 }}
      />
      <div className="absolute inset-0" />
    </div>
  );
}

export default function PresetsIndex() {
  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={siteTheme()} />
      <ThemeFX />
      <SiteHeader />
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-12 sm:px-10">
        <div className="mb-2 flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-black tracking-tight">Пресеты страниц</h1>
        </div>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Готовые композиции из наших кинематографических блоков — ниже каждый пресет показан вживую, на текущих
          клипах из <code>data/media.json</code>. Открой любой, чтобы посмотреть в полный экран.
        </p>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {PRESETS.map((p) => (
            <Link key={p.title} href={p.href} className="group">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur transition-shadow hover:shadow-lg">
                <LivePreview href={p.href} title={p.title} />
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight">{p.title}</h2>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">{p.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.blocks.map((b) => (
                      <span key={b} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-2 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Хочешь свой пресет? Скомпонуй блоки из <code>components/media/</code> в новом файле{' '}
          <code>app/presets/…/page.tsx</code> — все блоки принимают <code>MediaEntry</code>.
        </div>
      </div>
    </main>
  );
}
