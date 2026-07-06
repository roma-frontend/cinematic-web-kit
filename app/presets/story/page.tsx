import mediaData from '@/data/media.json';
import { padEntries as pad, type MediaEntry } from '@/lib/media';
import { SiteHeader } from '@/components/site-header';
import { VideoHero } from '@/components/media/video-hero';
import { StickyShowcase } from '@/components/media/sticky-showcase';
import { VideoSection } from '@/components/media/video-section';
import { VideoCardGrid } from '@/components/media/video-card';
import { Reveal } from '@/components/reveal';
import { ThemeStyle } from '@/components/theme-style';
import { ThemeFX } from '@/components/theme-fx';
import { pickTheme } from '@/lib/themes';

export const metadata = {
  title: 'Пресет: история бренда — Кинематографический кит',
  description: 'Полноэкранный сторителлинг на sticky-переходах и видеополосах.',
};

export default function StoryPreset() {
  const media = mediaData as MediaEntry[];
  const hero = media.find((m) => m.section === 'hero') ?? media[0];
  const bands = media.filter((m) => m.section === 'background');
  const cards = media.filter((m) => m.section === 'card');
  const pool = cards.length ? cards : media;

  if (!hero) {
    return (
      <main className="min-h-dvh">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center text-muted-foreground">
          Нет клипов в <code>data/media.json</code>. Сгенерируй хотя бы один в Студии, чтобы увидеть пресет.
        </div>
      </main>
    );
  }

  const bandEntry = bands[0] ?? pool[0] ?? hero;

  const brief = media.map((m) => `${m.title} ${m.subtitle ?? ''} ${m.prompt ?? ''}`).join(' ');
  const theme = pickTheme(brief);

  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <SiteHeader />

      {/* 1 — Full-bleed opening shot */}
      <VideoHero entry={hero} />

      {/* 2 — The story itself: sticky chapters over one clip */}
      <StickyShowcase
        entry={hero}
        panels={[
          { eyebrow: 'Глава 1', title: 'Как всё началось', text: 'Одна идея и одна камера. Остальное — упорство.' },
          { eyebrow: 'Глава 2', title: 'Первый продукт', text: 'То, что казалось невозможным, стало ежедневной работой.' },
          { eyebrow: 'Глава 3', title: 'Сегодня', text: 'Команда, стиль и собственный киноязык бренда.' },
        ]}
      />

      {/* 3 — Full-width video band as a visual pause */}
      <Reveal>
        <VideoSection
          entry={{
            ...bandEntry,
            subtitle: bandEntry.subtitle ?? 'Манифест',
            title: bandEntry.title || 'Мы верим в силу движущегося кадра',
          }}
        />
      </Reveal>

      {/* 4 — Milestones grid */}
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-16 sm:px-10">
        <Reveal>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">Вехи</h2>
          <p className="mb-6 text-sm text-muted-foreground">Моменты, которые сформировали бренд.</p>
          <VideoCardGrid entries={pad(pool, 3)} />
        </Reveal>
      </div>
    </main>
  );
}
