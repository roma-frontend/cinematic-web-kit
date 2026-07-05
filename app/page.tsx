import mediaData from '@/data/media.json';
import type { MediaEntry } from '@/lib/media';
import { VideoHero } from '@/components/media/video-hero';
import { VideoSection } from '@/components/media/video-section';
import { VideoCardGrid } from '@/components/media/video-card';
import { StickyShowcase } from '@/components/media/sticky-showcase';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Reveal } from '@/components/reveal';
import { AccentFromPoster } from '@/components/accent-from-poster';
import { Film, Sparkles } from 'lucide-react';
import Link from 'next/link';

// data/media.json is produced by the pipeline (scripts/media-pipeline). Static
// import → a rebuild picks up new clips; `next dev` hot-reloads them.
export default function Home() {
  const media = mediaData as MediaEntry[];
  const hero = media.find((m) => m.section === 'hero');
  const backgrounds = media.filter((m) => m.section === 'background');
  const cards = media.filter((m) => m.section === 'card');

  return (
    <main className="min-h-dvh">
      <AccentFromPoster src={hero?.poster} />
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[var(--container-max)] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <Film className="h-5 w-5 text-primary" />
            <span>Кинематографический кит</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/studio">
              <Button size="sm" className="gap-1.5 shadow-lg"><Sparkles className="h-4 w-4" /> Студия</Button>
            </Link>
          </div>
        </div>
      </header>

      {hero ? (
        <VideoHero entry={hero} />
      ) : (
        <section className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <Film className="h-12 w-12 text-primary" />
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Кинематографический веб-кит</h1>
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
            <h2 className="text-2xl font-bold tracking-tight">Избранные клипы</h2>
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
