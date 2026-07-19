'use client';

import { useState } from 'react';
import { Film, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { Locale } from '@/lib/seo';

interface BrandFilmGeneratorProps {
  locale: Locale;
  dnaId?: string;
}

const translations = {
  ru: {
    title: 'Мини-фильм бренда',
    subtitle: 'Сгенерируйте 30-секундный видео-ролик из одного описания',
    briefLabel: 'Описание бренда',
    briefPlaceholder: 'Опишите ваш бренд, продукт или услугу в нескольких предложениях...',
    durationLabel: 'Длительность (сек)',
    generateBtn: 'Сгенерировать сценарий',
    generating: 'Генерируем...',
    scenes: 'Сцены',
    scene: 'Сцена',
    duration: 'Длительность',
    prompt: 'Промпт',
    downloadScript: 'Скачать сценарий',
    generateVideos: 'Сгенерировать видео',
    success: 'Сценарий готов! Теперь вы можете сгенерировать видео для каждой сцены.',
  },
  en: {
    title: 'Brand Film',
    subtitle: 'Generate a 30-second video from a single brief',
    briefLabel: 'Brand description',
    briefPlaceholder: 'Describe your brand, product or service in a few sentences...',
    durationLabel: 'Duration (sec)',
    generateBtn: 'Generate script',
    generating: 'Generating...',
    scenes: 'Scenes',
    scene: 'Scene',
    duration: 'Duration',
    prompt: 'Prompt',
    downloadScript: 'Download script',
    generateVideos: 'Generate videos',
    success: 'Script is ready! Now you can generate videos for each scene.',
  },
  hy: {
    title: 'Brand Film',
    subtitle: 'Generate a 30-second video from a single brief',
    briefLabel: 'Brand description',
    briefPlaceholder: 'Describe your brand, product or service in a few sentences...',
    durationLabel: 'Duration (sec)',
    generateBtn: 'Generate script',
    generating: 'Generating...',
    scenes: 'Scenes',
    scene: 'Scene',
    duration: 'Duration',
    prompt: 'Prompt',
    downloadScript: 'Download script',
    generateVideos: 'Generate videos',
    success: 'Script is ready! Now you can generate videos for each scene.',
  },
};

interface FilmScene {
  id: string;
  type: 'hero' | 'feature' | 'emotion' | 'cta';
  title: string;
  prompt: string;
  duration: number;
  aspect: string;
}

export function BrandFilmGenerator({ locale, dnaId }: BrandFilmGeneratorProps) {
  const t = translations[locale];
  const [brief, setBrief] = useState('');
  const [duration, setDuration] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [scenes, setScenes] = useState<FilmScene[] | null>(null);

  const generateScript = async () => {
    if (!brief.trim()) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/brand-film', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, dnaId, duration }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      setScenes(data.scenes);
    } catch (error) {
      console.error('Brand film generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadScript = () => {
    if (!scenes) return;

    const scriptText = scenes
      .map(
        (scene, i) =>
          `Scene ${i + 1}: ${scene.title}\nDuration: ${scene.duration}s\nPrompt: ${scene.prompt}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brand-film-script.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

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
            {t.briefLabel}
          </label>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={t.briefPlaceholder}
            rows={4}
            className="resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t.durationLabel}
          </label>
          <input
            type="range"
            min={15}
            max={60}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-center text-xs text-muted-foreground">{duration}s</div>
        </div>
      </div>

      <Button
        onClick={generateScript}
        disabled={!brief.trim() || generating}
        className="mb-4 w-full"
        size="sm"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.generating}
          </>
        ) : (
          <>
            <Film className="mr-2 h-4 w-4" />
            {t.generateBtn}
          </>
        )}
      </Button>

      {scenes && (
        <div className="space-y-3 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">
              {t.scenes} ({scenes.length})
            </p>
            <Button onClick={downloadScript} size="sm" variant="outline">
              <Download className="mr-2 h-3 w-3" />
              {t.downloadScript}
            </Button>
          </div>

          <div className="space-y-2">
            {scenes.map((scene, i) => (
              <div
                key={scene.id}
                className="rounded-lg border border-border/60 bg-card/60 p-2"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {t.scene} {i + 1}: {scene.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {scene.duration}s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {scene.prompt}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-emerald-600">{t.success}</p>
        </div>
      )}
    </Card>
  );
}
