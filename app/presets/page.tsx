import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
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
    ready: true,
  },
  {
    href: '#',
    title: 'Портфолио',
    desc: 'Витрина работ на мозаике с крупными акцентными плитками. Скоро.',
    blocks: ['VideoMosaic', 'SplitHero'],
    ready: false,
  },
  {
    href: '#',
    title: 'История бренда',
    desc: 'Полноэкранный сторителлинг на sticky-переходах. Скоро.',
    blocks: ['StickyShowcase', 'VideoSection'],
    ready: false,
  },
];

export default function PresetsIndex() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-12 sm:px-10">
        <div className="mb-2 flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-black tracking-tight">Пресеты страниц</h1>
        </div>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Готовые композиции из наших кинематографических блоков. Открой пресет, чтобы увидеть его вживую на
          текущих клипах из <code>data/media.json</code>.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((p) => {
            const card = (
              <div
                className={`group flex h-full flex-col rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition-shadow ${
                  p.ready ? 'hover:shadow-lg' : 'opacity-70'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight">{p.title}</h2>
                  {p.ready ? (
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      Скоро
                    </span>
                  )}
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
            );
            return p.ready ? (
              <Link key={p.title} href={p.href}>
                {card}
              </Link>
            ) : (
              <div key={p.title}>{card}</div>
            );
          })}
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
