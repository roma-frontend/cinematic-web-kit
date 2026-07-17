'use client';

import { useState } from 'react';
import { BarChart3, Play, Pause, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Locale } from '@/lib/seo';
import { DNA_PRESETS } from '@/lib/cinematic-dna-client';
import {
  createABTest,
  getConversionRate,
  type ABTest,
} from '@/lib/cinematic-ab';

interface CinematicABCardProps {
  locale: Locale;
  onTestCreated?: (test: ABTest) => void;
}

const translations = {
  ru: {
    title: 'Cinematic A/B',
    subtitle: 'Тестируйте разные кинематографические стили для оптимизации конверсии',
    testName: 'Название теста',
    testDescription: 'Описание',
    selectVariants: 'Выберите варианты (DNA стили)',
    createBtn: 'Создать тест',
    startBtn: 'Запустить',
    pauseBtn: 'Пауза',
    variant: 'Вариант',
    impressions: 'Показы',
    conversions: 'Конверсии',
    conversionRate: 'Конверсия',
    winner: 'Победитель',
    noTests: 'Нет активных тестов',
    status: {
      draft: 'Черновик',
      running: 'Активен',
      paused: 'Пауза',
      completed: 'Завершён',
    },
  },
  en: {
    title: 'Cinematic A/B',
    subtitle: 'Test different cinematic styles to optimize conversion',
    testName: 'Test name',
    testDescription: 'Description',
    selectVariants: 'Select variants (DNA styles)',
    createBtn: 'Create test',
    startBtn: 'Start',
    pauseBtn: 'Pause',
    variant: 'Variant',
    impressions: 'Impressions',
    conversions: 'Conversions',
    conversionRate: 'Conversion rate',
    winner: 'Winner',
    noTests: 'No active tests',
    status: {
      draft: 'Draft',
      running: 'Running',
      paused: 'Paused',
      completed: 'Completed',
    },
  },
  hy: {
    title: 'Cinematic A/B',
    subtitle: 'Test different cinematic styles to optimize conversion',
    testName: 'Test name',
    testDescription: 'Description',
    selectVariants: 'Select variants (DNA styles)',
    createBtn: 'Create test',
    startBtn: 'Start',
    pauseBtn: 'Pause',
    variant: 'Variant',
    impressions: 'Impressions',
    conversions: 'Conversions',
    conversionRate: 'Conversion rate',
    winner: 'Winner',
    noTests: 'No active tests',
    status: {
      draft: 'Draft',
      running: 'Running',
      paused: 'Paused',
      completed: 'Completed',
    },
  },
};

export function CinematicABCard({ locale, onTestCreated }: CinematicABCardProps) {
  const t = translations[locale];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDnas, setSelectedDnas] = useState<string[]>([]);
  const [tests, setTests] = useState<ABTest[]>([]);

  const toggleDna = (dnaId: string) => {
    setSelectedDnas((prev) =>
      prev.includes(dnaId) ? prev.filter((id) => id !== dnaId) : [...prev, dnaId]
    );
  };

  const createTest = () => {
    if (!name.trim() || selectedDnas.length < 2) return;

    const test = createABTest(name, description, selectedDnas);
    setTests((prev) => [...prev, test]);
    onTestCreated?.(test);

    setName('');
    setDescription('');
    setSelectedDnas([]);
  };

  const startTest = (testId: string) => {
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId ? { ...t, status: 'running', startDate: Date.now() } : t
      )
    );
  };

  const pauseTest = (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'paused' } : t))
    );
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t.subtitle}</p>

      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.testName}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hero Video Test"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.testDescription}
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Testing different cinematic styles for hero section..."
            rows={2}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.selectVariants} ({selectedDnas.length} selected)
          </label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-2">
            {DNA_PRESETS.map((dna) => (
              <label
                key={dna.id}
                className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={selectedDnas.includes(dna.id)}
                  onChange={() => toggleDna(dna.id)}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="text-xs font-medium">{dna.label}</p>
                  <p className="text-xs text-muted-foreground">{dna.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={createTest}
        disabled={!name.trim() || selectedDnas.length < 2}
        className="mb-4 w-full"
        size="sm"
      >
        {t.createBtn}
      </Button>

      {tests.length > 0 && (
        <div className="space-y-3 border-t border-border/60 pt-3">
          {tests.map((test) => (
            <div
              key={test.id}
              className="rounded-lg border border-border/60 bg-card/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{test.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.status[test.status]}
                  </p>
                </div>
                {test.status === 'draft' && (
                  <Button
                    onClick={() => startTest(test.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Play className="mr-1 h-3 w-3" />
                    {t.startBtn}
                  </Button>
                )}
                {test.status === 'running' && (
                  <Button
                    onClick={() => pauseTest(test.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Pause className="mr-1 h-3 w-3" />
                    {t.pauseBtn}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {test.variants.map((variant) => {
                  const rate = getConversionRate(variant);
                  const isWinner = test.winner === variant.id;

                  return (
                    <div
                      key={variant.id}
                      className="rounded border border-border/40 bg-muted/10 p-2"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {variant.label}
                          {isWinner && (
                            <Trophy className="ml-1 inline h-3 w-3 text-amber-500" />
                          )}
                        </span>
                        <span className="text-xs font-semibold">
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>
                          {t.impressions}: {variant.impressions}
                        </span>
                        <span>
                          {t.conversions}: {variant.conversions}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tests.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">{t.noTests}</p>
      )}
    </Card>
  );
}
