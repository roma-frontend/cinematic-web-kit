'use client';

import { useState } from 'react';
import { Sparkles, Play } from 'lucide-react';
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
  INTERACTION_PRESETS,
  type InteractionType,
  type SceneInteraction,
} from '@/lib/scene-director';

interface SceneDirectorCardProps {
  locale: Locale;
  onInteractionChange?: (interaction: SceneInteraction) => void;
}

const translations = {
  ru: {
    title: 'Scene Director',
    subtitle: 'Создайте интерактивные сцены, реагирующие на действия пользователя',
    interactionType: 'Тип интерактивности',
    intensity: 'Интенсивность',
    smoothing: 'Плавность',
    axis: 'Ось',
    applyBtn: 'Применить',
    preview: 'Предпросмотр',
    axisOptions: {
      x: 'Горизонтальная',
      y: 'Вертикальная',
      both: 'Обе',
    },
  },
  en: {
    title: 'Scene Director',
    subtitle: 'Create interactive scenes that respond to user actions',
    interactionType: 'Interaction type',
    intensity: 'Intensity',
    smoothing: 'Smoothing',
    axis: 'Axis',
    applyBtn: 'Apply',
    preview: 'Preview',
    axisOptions: {
      x: 'Horizontal',
      y: 'Vertical',
      both: 'Both',
    },
  },
  hy: {
    title: 'Scene Director',
    subtitle: 'Create interactive scenes that respond to user actions',
    interactionType: 'Interaction type',
    intensity: 'Intensity',
    smoothing: 'Smoothing',
    axis: 'Axis',
    applyBtn: 'Apply',
    preview: 'Preview',
    axisOptions: {
      x: 'Horizontal',
      y: 'Vertical',
      both: 'Both',
    },
  },
};

export function SceneDirectorCard({
  locale,
  onInteractionChange,
}: SceneDirectorCardProps) {
  const t = translations[locale];
  const [interactionType, setInteractionType] = useState<InteractionType>('parallax');
  const [intensity, setIntensity] = useState(0.5);
  const [smoothing, setSmoothing] = useState(0.8);
  const [axis, setAxis] = useState<'x' | 'y' | 'both'>('both');

  const applyInteraction = () => {
    const interaction: SceneInteraction = {
      type: interactionType,
      intensity,
      smoothing,
      axis,
    };
    onInteractionChange?.(interaction);
  };

  const selectedPreset = INTERACTION_PRESETS[interactionType];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t.subtitle}</p>

      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.interactionType}
          </label>
          <Select
            value={interactionType}
            onValueChange={(v) => setInteractionType(v as InteractionType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTERACTION_PRESETS).map(([key, preset]) => (
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
            {t.intensity}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-xs text-muted-foreground">
            {Math.round(intensity * 100)}%
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.smoothing}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={smoothing}
            onChange={(e) => setSmoothing(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-xs text-muted-foreground">
            {Math.round(smoothing * 100)}%
          </div>
        </div>

        {(interactionType === 'mouse-tilt' || interactionType === 'gyroscope') && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t.axis}
            </label>
            <Select value={axis} onValueChange={(v) => setAxis(v as 'x' | 'y' | 'both')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(t.axisOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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

      <Button onClick={applyInteraction} className="w-full" size="sm">
        <Play className="mr-2 h-4 w-4" />
        {t.applyBtn}
      </Button>
    </Card>
  );
}
