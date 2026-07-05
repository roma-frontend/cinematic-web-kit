'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useState } from 'react';

type Rating = 'good' | 'needs' | 'poor' | 'pending';

interface MetricDef {
  name: string;
  label: string;
  unit: 'ms' | '';
  good: number; // ≤ good → good
  poor: number; // > poor → poor
  hint: string;
}

// Thresholds mirror Google/Cloudflare Core Web Vitals scoring.
const DEFS: Record<string, MetricDef> = {
  LCP: { name: 'LCP', label: 'Largest Contentful Paint', unit: 'ms', good: 2500, poor: 4000, hint: 'Скорость отрисовки главного контента' },
  INP: { name: 'INP', label: 'Interaction to Next Paint', unit: 'ms', good: 200, poor: 500, hint: 'Отзывчивость на действия' },
  CLS: { name: 'CLS', label: 'Cumulative Layout Shift', unit: '', good: 0.1, poor: 0.25, hint: 'Стабильность вёрстки' },
  FCP: { name: 'FCP', label: 'First Contentful Paint', unit: 'ms', good: 1800, poor: 3000, hint: 'Первая отрисовка' },
  TTFB: { name: 'TTFB', label: 'Time to First Byte', unit: 'ms', good: 800, poor: 1800, hint: 'Ответ сервера' },
};

const ORDER = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];

function rate(def: MetricDef, value: number | undefined): Rating {
  if (value === undefined) return 'pending';
  if (value <= def.good) return 'good';
  if (value > def.poor) return 'poor';
  return 'needs';
}

function format(def: MetricDef, value: number | undefined): string {
  if (value === undefined) return '—';
  return def.unit === 'ms' ? `${Math.round(value)} ms` : value.toFixed(3);
}

const RATING_STYLE: Record<Rating, { dot: string; text: string; label: string }> = {
  good: { dot: 'bg-green-500', text: 'text-green-500', label: 'Хорошо' },
  needs: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Средне' },
  poor: { dot: 'bg-red-500', text: 'text-red-500', label: 'Плохо' },
  pending: { dot: 'bg-muted-foreground/40', text: 'text-muted-foreground', label: 'Ожидание…' },
};

export function WebVitals() {
  const [values, setValues] = useState<Record<string, number>>({});

  useReportWebVitals((metric) => {
    if (metric.name in DEFS) {
      setValues((prev) => ({ ...prev, [metric.name]: metric.value }));
    }
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ORDER.map((key) => {
        const def = DEFS[key];
        const value = values[key];
        const r = rate(def, value);
        const style = RATING_STYLE[r];
        // Progress relative to the "poor" boundary for a subtle bar.
        const pct = value === undefined ? 0 : Math.min(100, (value / def.poor) * 100);
        return (
          <div key={key} className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{def.name}</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight tabular-nums">{format(def, value)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{def.label}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all ${style.dot}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground/80">{def.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
