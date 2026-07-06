import mediaData from '@/data/media.json';
import { padEntries as pad, type MediaEntry } from '@/lib/media';
import { SiteHeader } from '@/components/site-header';
import { SplitHero } from '@/components/media/split-hero';
import { VideoMosaic } from '@/components/media/video-mosaic';
import { VideoCardGrid } from '@/components/media/video-card';
import { Reveal } from '@/components/reveal';
import { ThemeStyle } from '@/components/theme-style';
import { ThemeFX } from '@/components/theme-fx';
import { pickTheme } from '@/lib/themes';

export const metadata = {
  title: 'Пресет: портфолио — Кинематографический кит',
  description: 'Витрина работ на видеомозаике с крупными акцентными плитками.',
};

export default function PortfolioPreset() {
  const media = mediaData as MediaEntry[];
  const cards = media.filter((m) => m.section === 'card');
  const pool = cards.length ? cards : media;
  const intro = media.find((m) => m.section === 'hero') ?? pool[0];

  if (!intro) {
    return (
      <main className="min-h-dvh">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center text-muted-foreground">
          Нет клипов в <code>data/media.json</code>. Сгенерируй хотя бы один в Студии, чтобы увидеть пресет.
        </div>
      </main>
    );
  }

  const brief = media.map((m) => `${m.title} ${m.subtitle ?? ''} ${m.prompt ?? ''}`).join(' ');
  const theme = pickTheme(brief);

  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <SiteHeader />

      {/* 1 — Split intro: who we are + a signature clip */}
      <SplitHero
        entry={{
          ...intro,
          subtitle: intro.subtitle ?? 'Портфолио',
          prompt: intro.prompt ?? 'Избранные работы студии — каждая в движении. Листайте вниз и смотрите проекты вживую.',
          ctaLabel: 'Смотреть работы',
          ctaHref: '#works',
        }}
      />

      {/* 2 — The works: editorial mosaic with big accent tiles */}
      <div id="works">
        <Reveal>
          <div className="mx-auto max-w-[var(--container-max)] px-6 pt-8 sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight">Работы</h2>
            <p className="text-sm text-muted-foreground">Мозаика с акцентными плитками — живая, а не статичная.</p>
          </div>
          <VideoMosaic entries={pad(pool, 9)} />
        </Reveal>
      </div>

      {/* 3 — Process: mirrored split block */}
      <Reveal>
        <SplitHero
          reverse
          entry={{
            ...(pool[1] ?? intro),
            subtitle: 'Процесс',
            title: 'От брифа до кадра',
            prompt: 'Описываете задачу — получаете страницу с фирменным видео. Стиль, свет и ритм выдержаны по всему сайту.',
            ctaLabel: 'Обсудить проект',
            ctaHref: '/site/contact',
          }}
        />
      </Reveal>

      {/* 4 — Compact catalog of everything else */}
      <div className="mx-auto max-w-[var(--container-max)] px-6 pb-16 sm:px-10">
        <Reveal>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Все проекты</h2>
          <VideoCardGrid entries={pad(pool, 6)} />
        </Reveal>
      </div>
    </main>
  );
}
