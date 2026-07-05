import Link from 'next/link';
import mediaData from '@/data/media.json';
import siteConfig from '@/data/site.json';
import type { MediaEntry } from '@/lib/media';
import type { LayoutBlock } from '@/lib/themes';
import { ThemeStyle } from '@/components/theme-style';
import { THEMES } from '@/lib/themes';
import { activeSiteTheme } from '@/lib/site-theme';
import { ThemeFX } from '@/components/theme-fx';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PageComposer } from '@/components/page-composer';
import { VideoCardGrid } from '@/components/media/video-card';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Wand2, Palette, LayoutTemplate, Globe, Video, ArrowRight, Check,
} from 'lucide-react';

const ok = (v: string) => `oklch(${v})`;

const STEPS = [
  {
    n: '01',
    title: 'Опишите идею',
    text: 'Напишите бриф — Студия соберёт кинематографический промпт, сгенерирует ИИ-видео и подберёт тему под ваш продукт.',
    icon: Wand2,
  },
  {
    n: '02',
    title: 'Соберите страницы',
    text: 'Визуальный конструктор с drag-and-drop, живым предпросмотром и готовыми лендингами. Никакого кода.',
    icon: LayoutTemplate,
  },
  {
    n: '03',
    title: 'Опубликуйте',
    text: 'Один клик — и сайт живёт на вашем поддомене. Меняйте контент в любой момент, обновления сразу онлайн.',
    icon: Globe,
  },
];

const FEATURES = [
  { title: 'ИИ-видео', text: 'Кинематографические ролики из текстового промпта, автоматически оптимизированные в .webm с постером.', icon: Video },
  { title: 'Авто-темы', text: 'Движок подбирает палитру, шрифты, радиусы и характер анимаций под содержание вашего сайта.', icon: Palette },
  { title: 'Визуальный конструктор', text: 'Многостраничный редактор: секции, стили, варианты блоков, undo/redo, адаптив под мобильные.', icon: LayoutTemplate },
  { title: 'Публикация на поддомене', text: 'Собственный адрес вида your-brand.site, мгновенные обновления и живой предпросмотр.', icon: Globe },
];

export default function Home() {
  const media = mediaData as MediaEntry[];
  const theme = activeSiteTheme();
  const examples = media.slice(0, 6);
  const layout = (siteConfig as { layout?: LayoutBlock[] | null }).layout ?? undefined;
  // When the site has content built in the Studio, the landing renders that
  // composed page (theme + layout + media) inside the shared header/footer.
  // Otherwise it falls back to the platform marketing page below.
  const composed = media.length > 0;

  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <SiteHeader />

      {composed && <PageComposer theme={theme} media={media} layoutOverride={layout && layout.length ? layout : undefined} />}

      {!composed && (
      <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-20 text-center sm:px-10 sm:py-24">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> ИИ-платформа для сайтов
          </span>
          <h1 className="mx-auto max-w-4xl text-balance font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Соберите и опубликуйте сайт с помощью ИИ
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            Опишите идею — платформа сгенерирует видео и тему, соберёт страницы в визуальном
            конструкторе и опубликует сайт на вашем поддомене. Без кода и дизайнеров.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="gap-2 shadow-lg">
                <Sparkles className="h-5 w-5" /> Начать бесплатно
              </Button>
            </Link>
            <Link href="/studio">
              <Button size="lg" variant="outline" className="gap-2">
                Открыть Студию <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Без карты · старт за пару минут</p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Как это работает</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Три шага от идеи до опубликованного сайта.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-3xl font-black text-muted-foreground/25">{s.n}</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Возможности</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Всё для запуска красивого сайта — в одном месте.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur transition-colors hover:border-primary/50">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Themes gallery teaser */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Готовые темы</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">Палитра, шрифты и анимации подбираются автоматически под ваш продукт.</p>
          </div>
          <Link href="/themes">
            <Button variant="outline" size="sm" className="gap-1.5">Все темы <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.slice(0, 6).map((t) => {
            const d = t.dark;
            return (
              <Link
                key={t.id}
                href="/themes"
                className="group overflow-hidden rounded-2xl border shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ background: ok(d.background), color: ok(d.foreground), borderColor: t.id === theme.id ? ok(d.primary) : ok(d.border) }}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold tracking-tight">{t.label}</span>
                    {t.id === theme.id && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: ok(d.primary), color: ok(d['primary-foreground']) }}>
                        <Check className="h-3 w-3" /> активна
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: ok(d['muted-foreground']) }}>{t.fontDisplay} · движение {t.motion}</p>
                  <div className="mt-4 flex gap-2">
                    {[d.primary, d.card, d.muted, d.foreground, d.border].map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-md" style={{ background: ok(c), border: `1px solid ${ok(d.border)}` }} />
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Made on the platform — real example from demo content */}
      {examples.length > 0 && (
        <section className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10 sm:py-20">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Video className="h-3.5 w-3.5 text-primary" /> Сделано на платформе
            </span>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Пример живого сайта</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Эти секции с ИИ-видео собраны прямо в Студии — так выглядит результат.
            </p>
          </div>
          <VideoCardGrid entries={examples} />
        </section>
      )}

      {/* Final CTA */}
      <section className="mx-auto max-w-[var(--container-max)] px-6 py-20 sm:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-10 text-center backdrop-blur sm:p-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(60% 60% at 50% 0%, var(--primary), transparent 70%)' }} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-black tracking-tight sm:text-4xl">
              Запустите свой сайт уже сегодня
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Опишите идею — остальное сделает платформа. Публикация на поддомене в один клик.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 shadow-lg"><Sparkles className="h-5 w-5" /> Начать бесплатно</Button>
              </Link>
              <Link href="/studio/builder">
                <Button size="lg" variant="outline" className="gap-2"><LayoutTemplate className="h-5 w-5" /> Открыть конструктор</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}
