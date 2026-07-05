import { SiteHeader } from '@/components/site-header';
import { THEMES, FONT_VAR, type Theme } from '@/lib/themes';
import { Palette } from 'lucide-react';

export const metadata = {
  title: 'Темы / шаблоны — Кинематографический кит',
  description: 'Галерея дизайн-тем, которые движок подбирает под тему сайта.',
};

const ok = (v: string) => `oklch(${v})`;

function ThemePreview({ theme }: { theme: Theme }) {
  const d = theme.dark;
  const swatches: [string, string][] = [
    ['primary', d.primary],
    ['card', d.card],
    ['muted', d.muted],
    ['foreground', d.foreground],
    ['border', d.border],
  ];
  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-lg"
      style={{ background: ok(d.background), color: ok(d.foreground), borderColor: ok(d.border) }}
    >
      {/* Preview surface */}
      <div className="p-6" style={{ background: ok(d.background) }}>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: ok(d['muted-foreground']) }}>
          {theme.id}
        </p>
        <h3 className="text-3xl font-black tracking-tight" style={{ fontFamily: FONT_VAR[theme.fontDisplay] }}>
          {theme.label}
        </h3>
        <p className="mt-1 text-sm" style={{ color: ok(d['muted-foreground']) }}>
          Заголовки: {theme.fontDisplay} · радиус {theme.radius} · движение {theme.motion}
        </p>

        {/* Sample card + button */}
        <div className="mt-4 rounded-xl p-4" style={{ background: ok(d.card), border: `1px solid ${ok(d.border)}` }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Пример карточки</span>
            <button
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ background: ok(d.primary), color: ok(d['primary-foreground']), borderRadius: theme.radius }}
            >
              Кнопка
            </button>
          </div>
        </div>

        {/* Swatches */}
        <div className="mt-4 flex flex-wrap gap-2">
          {swatches.map(([name, val]) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-md" style={{ background: ok(val), border: `1px solid ${ok(d.border)}` }} />
              <span className="text-[11px]" style={{ color: ok(d['muted-foreground']) }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Routing keywords */}
      <div className="px-6 pb-5" style={{ background: ok(d.background) }}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: ok(d['muted-foreground']) }}>
          Срабатывает на
        </p>
        {theme.keywords.length === 0 ? (
          <span className="text-xs" style={{ color: ok(d['muted-foreground']) }}>
            по умолчанию (если ничего не совпало)
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {theme.keywords.slice(0, 10).map((k) => (
              <span
                key={k}
                className="rounded-md px-2 py-0.5 text-[11px]"
                style={{ background: ok(d.muted), color: ok(d['muted-foreground']) }}
              >
                {k}
              </span>
            ))}
            {theme.keywords.length > 10 && (
              <span className="text-[11px]" style={{ color: ok(d['muted-foreground']) }}>
                +{theme.keywords.length - 10}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThemesPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-12 sm:px-10">
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-black tracking-tight">Темы / шаблоны</h1>
        </div>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Движок автоматически подбирает тему под содержание сайта (палитра, шрифт заголовков, радиусы,
          характер анимаций). Ниже — превью в тёмной схеме и ключевые слова, по которым тема выбирается.
          Например, бриф про кофе даст «Editorial Coffee», про матч — «Sport Dynamic».
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((theme) => (
            <ThemePreview key={theme.id} theme={theme} />
          ))}
        </div>
      </div>
    </main>
  );
}
