import mediaData from '@/data/media.json';
import type { MediaEntry } from '@/lib/media';
import { VideoHero } from '@/components/media/video-hero';
import { VideoSection } from '@/components/media/video-section';
import { VideoCardGrid } from '@/components/media/video-card';
import { StickyShowcase } from '@/components/media/sticky-showcase';
import { Reveal } from '@/components/reveal';
import { ThemeStyle } from '@/components/theme-style';
import { pickTheme, getTheme } from '@/lib/themes';
import { ThemeFX } from '@/components/theme-fx';
import { SiteHeader } from '@/components/site-header';
import { Film } from 'lucide-react';

// data/media.json is produced by the pipeline (scripts/media-pipeline). Static
// import → a rebuild picks up new clips; `next dev` hot-reloads them.
export default async function Home({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const sp = await searchParams;
  const media = mediaData as MediaEntry[];
  const hero = media.find((m) => m.section === 'hero');
  const backgrounds = media.filter((m) => m.section === 'background');
  const cards = media.filter((m) => m.section === 'card');

  // The theme is chosen from the page's own content, so the whole design
  // (palette, display font, radius) adapts to the topic — coffee vs sport etc.
  // `?theme=<id>` overrides it for live preview.
  const brief = media.map((m) => `${m.title} ${m.subtitle ?? ''} ${m.prompt ?? ''}`).join(' ');
  const theme = sp.theme ? getTheme(sp.theme) : pickTheme(brief);

  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <SiteHeader />

      {hero ? (
        <VideoHero entry={hero} />
      ) : (
        <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <Film className="h-12 w-12 text-primary" />
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">Кинематографический веб-кит</h1>
          <p className="max-w-xl text-muted-foreground">
            Генерируйте кинематографические ИИ-видео, автоматически оптимизируйте их в <code>.webm</code> и
            выводите в красивых секциях. Запустите пайплайн, чтобы наполнить эту страницу.
          </p>
          <pre className="mt-2 max-w-full overflow-x-auto rounded-xl border bg-muted px-4 py-3 text-left text-xs">
{`MUAPI_KEY=sk-... npm run media -- \\
  --prompt "Cinematic macro shot of brake discs, sparks, slow motion" \\
  --section hero --title "Engineered to Stop" --subtitle "Performance"`}
          </pre>
        </section>
      )}

      <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10">
        <Reveal>
          <div className="mb-8 flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            <h2 className="font-display text-2xl font-bold tracking-tight">Избранные клипы</h2>
          </div>
        </Reveal>
        {cards.length > 0 ? (
          <Reveal delay={0.1}>
            <VideoCardGrid entries={cards} />
          </Reveal>
        ) : (
          <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Пока нет клипов <code>card</code>. Добавьте один:{' '}
            <code>npm run media -- --from ./clip.mp4 --section card --title &quot;Фильтры&quot;</code>
          </p>
        )}
      </div>

      {backgrounds.map((entry) => (
        <Reveal key={entry.id} className="my-8">
          <VideoSection entry={entry} />
        </Reveal>
      ))}

      {hero && (
        <StickyShowcase
          entry={hero}
          panels={[
            { eyebrow: hero.subtitle, title: hero.title },
            { title: 'Одна идея — целая страница', text: 'Опишите бриф, а Студия соберёт кинематографические промпты и сгенерирует все секции в едином стиле.' },
            { title: 'Готово к продакшену', text: 'Клипы оптимизируются в .webm + MP4-фолбэк, ленивая загрузка и умный постер — быстрый LCP из коробки.' },
          ]}
        />
      )}
    </main>
  );
}
