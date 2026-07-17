'use client';

import { Film, TrendingUp, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { CinematicScoreResult } from '@/lib/cinematic-score';
import type { Locale } from '@/lib/seo';

interface CinematicScoreCardProps {
  score: CinematicScoreResult | null;
  locale?: Locale;
}

const translations = {
  ru: {
    title: 'Кинематографическая оценка',
    loading: 'Загрузка оценки...',
    overallScore: 'Общий балл',
    recommendations: 'Рекомендации',
    breakdown: {
      dnaConsistency: 'DNA',
      videoQuality: 'Видео',
      colorHarmony: 'Цвета',
      motionDesign: 'Движение',
      visualRhythm: 'Ритм',
    },
  },
  en: {
    title: 'Cinematic Score',
    loading: 'Loading score...',
    overallScore: 'Overall score',
    recommendations: 'Recommendations',
    breakdown: {
      dnaConsistency: 'DNA',
      videoQuality: 'Video',
      colorHarmony: 'Colors',
      motionDesign: 'Motion',
      visualRhythm: 'Rhythm',
    },
  },
  hy: {
    title: 'Cinematic Score',
    loading: 'Loading score...',
    overallScore: 'Overall score',
    recommendations: 'Recommendations',
    breakdown: {
      dnaConsistency: 'DNA',
      videoQuality: 'Video',
      colorHarmony: 'Colors',
      motionDesign: 'Motion',
      visualRhythm: 'Rhythm',
    },
  },
};

export function CinematicScoreCard({ score, locale = 'ru' }: CinematicScoreCardProps) {
  const t = translations[locale];
  
  if (!score) {
    return (
      <Card className="p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Film className="h-4 w-4 text-primary" />
          {t.title}
        </p>
        <p className="text-xs text-muted-foreground">{t.loading}</p>
      </Card>
    );
  }

  const gradeColors: Record<string, string> = {
    S: 'text-primary bg-primary/10 border-primary/30',
    A: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
    B: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
    C: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
    D: 'text-red-600 bg-red-500/10 border-red-500/30',
  };

  return (
    <Card className="p-3">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Film className="h-4 w-4 text-primary" />
        {t.title}
      </p>

      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xl font-bold ${gradeColors[score.grade]}`}>
          {score.grade}
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t.overallScore}</span>
            <span className="text-lg font-bold">{score.total}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${score.total}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {Object.entries(score.breakdown).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground">
              {t.breakdown[key as keyof typeof t.breakdown]}
            </span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
            <span className="w-8 text-right text-xs font-medium">{value}</span>
          </div>
        ))}
      </div>

      {score.suggestions.length > 0 && (
        <div className="space-y-1.5 border-t border-border/60 pt-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {t.recommendations}
          </p>
          {score.suggestions.slice(0, 3).map((suggestion, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
