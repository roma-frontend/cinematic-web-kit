import { SiteHeader } from '@/components/site-header';
import { WebVitals } from '@/components/web-vitals';
import { Gauge } from 'lucide-react';

export const metadata = {
  title: 'Web Vitals — Кинематографический кит',
  description: 'Живой дашборд Core Web Vitals (LCP, INP, CLS) этой страницы.',
};

export default function VitalsPage() {
  return (
    <main className="min-h-dvh">
      <SiteHeader />
      <div className="mx-auto max-w-[var(--container-max)] px-6 py-12 sm:px-10">
        <div className="mb-2 flex items-center gap-2">
          <Gauge className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-black tracking-tight">Web Vitals — вживую</h1>
        </div>
        <p className="mb-8 max-w-2xl text-muted-foreground">
          Те же метрики производительности, что собирает Cloudflare Web Analytics, — измеряются прямо в твоём
          браузере через <code>next/web-vitals</code>. Значения появляются по мере взаимодействия со страницей
          (INP — после первого клика/скролла). Пороги совпадают с Core Web Vitals.
        </p>

        <WebVitals />

        <div className="mt-10 grid gap-4 rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground backdrop-blur sm:grid-cols-3">
          <div>
            <p className="font-semibold text-foreground">LCP · INP · CLS</p>
            <p className="mt-1">Три ключевые метрики Google/Cloudflare. Остальные (FCP, TTFB) — вспомогательные.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Оценки</p>
            <p className="mt-1">
              <span className="text-green-500">Хорошо</span> ≤ порога, <span className="text-amber-400">Средне</span> — между,{' '}
              <span className="text-red-500">Плохо</span> — выше верхнего порога.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Прод vs дев</p>
            <p className="mt-1">В dev-режиме числа хуже из-за несжатых бандлов — сверяйся на проде.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
