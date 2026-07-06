import mediaData from '@/data/media.json';
import { padEntries as pad, type MediaEntry } from '@/lib/media';
import { SiteHeader } from '@/components/site-header';
import { VideoHero } from '@/components/media/video-hero';
import { SplitHero } from '@/components/media/split-hero';
import { BeforeAfter } from '@/components/media/before-after';
import { StickyShowcase } from '@/components/media/sticky-showcase';
import { VideoMosaic } from '@/components/media/video-mosaic';
import { VideoCardGrid } from '@/components/media/video-card';
import { Reveal } from '@/components/reveal';
import { ThemeStyle } from '@/components/theme-style';
import { ThemeFX } from '@/components/theme-fx';
import { pickTheme } from '@/lib/themes';

export const metadata = {
  title: 'Пресет: продукт — Кинематографический кит',
  description: 'Готовый лендинг продукта, собранный из кинематографических блоков.',
};

export default function ProductPreset() {
  const media = mediaData as MediaEntry[];
  const hero = media.find((m) => m.section === 'hero') ?? media[0];
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

  const splitEntry = pool[0] ?? hero;
  const beforeEntry = pool[0] ?? hero;
  const afterEntry = pool[1] ?? hero;

  const brief = media.map((m) => `${m.title} ${m.subtitle ?? ''} ${m.prompt ?? ''}`).join(' ');
  const theme = pickTheme(brief);

  return (
    <main className="min-h-dvh">
      <ThemeStyle theme={theme} />
      <ThemeFX />
      <SiteHeader />

      {/* 1 — Full-bleed hero */}
      <VideoHero entry={hero} />

      {/* 2 — Split hero: feature intro */}
      <Reveal>
        <SplitHero
          entry={{
            ...splitEntry,
            subtitle: splitEntry.subtitle ?? 'Особенность',
            prompt: splitEntry.prompt ?? 'Опишите ключевую фишку продукта одним ёмким абзацем — здесь он выглядит кинематографично.',
            ctaLabel: 'Узнать больше',
            ctaHref: '#mosaic',
          }}
        />
      </Reveal>

      {/* 3 — Before / after comparison */}
      <Reveal>
        <div className="mx-auto mb-2 max-w-[var(--container-max)] px-6 sm:px-10">
          <h2 className="text-2xl font-bold tracking-tight">До и после</h2>
          <p className="text-sm text-muted-foreground">Перетащите ползунок — сравнение двух версий.</p>
        </div>
        <BeforeAfter before={beforeEntry} after={afterEntry} />
      </Reveal>

      {/* 4 — Sticky narrative */}
      <StickyShowcase
        entry={hero}
        panels={[
          { eyebrow: 'История', title: hero.title },
          { title: 'Каждая деталь — в кадре', text: 'Кинематографические ролики удерживают внимание там, где статичные баннеры проигрывают.' },
          { title: 'Соберите за минуты', text: 'Опишите бриф — и вся страница рождается в едином стиле.' },
        ]}
      />

      {/* 5 — Editorial mosaic */}
      <div id="mosaic">
        <Reveal>
          <div className="mx-auto max-w-[var(--container-max)] px-6 pt-8 sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight">Галерея</h2>
          </div>
          <VideoMosaic entries={pad(pool, 7)} />
        </Reveal>
      </div>

      {/* 6 — Product cards */}
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-12 sm:px-10">
        <Reveal>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Каталог</h2>
          <VideoCardGrid entries={pad(pool, 6)} />
        </Reveal>
      </div>
    </main>
  );
}
