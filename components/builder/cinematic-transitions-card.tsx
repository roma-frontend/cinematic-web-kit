'use client';

import { useState } from 'react';
import { Film } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/lib/seo';
import {
  TRANSITION_PRESETS,
  type TransitionType,
  type CinematicTransition,
} from '@/lib/cinematic-transitions';

interface CinematicTransitionsCardProps {
  locale: Locale;
  onTransitionChange?: (transition: CinematicTransition) => void;
}

const translations = {
  ru: {
    title: 'Кинопереходы',
    subtitle: 'Добавьте кинематографические переходы между секциями',
    transitionType: 'Тип перехода',
    duration: 'Длительность (мс)',
    easing: 'Плавность',
    applyBtn: 'Применить переход',
    preview: 'Предпросмотр',
    easingOptions: {
      'ease-in-out': 'Плавная',
      'ease-in': 'Ускорение',
      'ease-out': 'Замедление',
      linear: 'Линейная',
      'cubic-bezier(0.68, -0.55, 0.265, 1.55)': 'Пружина',
    },
  },
  en: {
    title: 'Cinematic Transitions',
    subtitle: 'Add cinematic transitions between sections',
    transitionType: 'Transition type',
    duration: 'Duration (ms)',
    easing: 'Easing',
    applyBtn: 'Apply transition',
    preview: 'Preview',
    easingOptions: {
      'ease-in-out': 'Smooth',
      'ease-in': 'Accelerate',
      'ease-out': 'Decelerate',
      linear: 'Linear',
      'cubic-bezier(0.68, -0.55, 0.265, 1.55)': 'Spring',
    },
  },
  hy: {
    title: 'Cinematic Transitions',
    subtitle: 'Add cinematic transitions between sections',
    transitionType: 'Transition type',
    duration: 'Duration (ms)',
    easing: 'Easing',
    applyBtn: 'Apply transition',
    preview: 'Preview',
    easingOptions: {
      'ease-in-out': 'Smooth',
      'ease-in': 'Accelerate',
      'ease-out': 'Decelerate',
      linear: 'Linear',
      'cubic-bezier(0.68, -0.55, 0.265, 1.55)': 'Spring',
    },
  },
};

export function CinematicTransitionsCard({
  locale,
  onTransitionChange,
}: CinematicTransitionsCardProps) {
  const t = translations[locale];
  const [transitionType, setTransitionType] = useState<TransitionType>('fade');
  const [duration, setDuration] = useState(600);
  const [easing, setEasing] = useState('ease-in-out');

  const applyTransition = () => {
    const transition: CinematicTransition = {
      type: transitionType,
      duration,
      easing,
    };
    onTransitionChange?.(transition);
  };

  const selectedPreset = TRANSITION_PRESETS[transitionType];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Film className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t.subtitle}</p>

      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.transitionType}
          </label>
          <Select
            value={transitionType}
            onValueChange={(v) => setTransitionType(v as TransitionType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSITION_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="font-medium">{preset.label[locale]}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description[locale]}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.duration}
          </label>
          <input
            type="range"
            min={200}
            max={2000}
            step={100}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-xs text-muted-foreground">
            {duration}ms
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.easing}
          </label>
          <Select value={easing} onValueChange={setEasing}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(t.easingOptions).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {t.preview}
        </p>
        <div className="space-y-1 text-xs">
          <p>
            <strong>{selectedPreset.label[locale]}</strong>
          </p>
          <p className="text-muted-foreground">{selectedPreset.description[locale]}</p>
        </div>
      </div>

      <Button onClick={applyTransition} className="w-full" size="sm">
        {t.applyBtn}
      </Button>
    </Card>
  );
}
