'use client';

import { useState, useRef } from 'react';
import { Upload, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Locale } from '@/lib/seo';

interface MoodBoardUploaderProps {
  locale: Locale;
  onDnaRecommended?: (dnaId: string) => void;
}

const translations = {
  ru: {
    title: 'Mood Board → DNA',
    subtitle: 'Загрузите изображения-референсы, и AI подберёт кинематографический стиль',
    uploadBtn: 'Загрузить изображения',
    analyzing: 'Анализируем...',
    maxImages: 'Максимум 10 изображений',
    removeImage: 'Удалить',
    analyzeBtn: 'Анализировать стиль',
    recommendedDna: 'Рекомендуемый стиль',
    mood: 'Настроение',
    energy: 'Энергия',
    temperature: 'Температура',
    style: 'Стиль',
    confidence: 'Уверенность',
    applyDna: 'Применить стиль',
    moodOptions: {
      calm: 'Спокойное',
      balanced: 'Сбалансированное',
      energetic: 'Энергичное',
      dramatic: 'Драматичное',
    },
    energyOptions: {
      low: 'Низкая',
      medium: 'Средняя',
      high: 'Высокая',
    },
    temperatureOptions: {
      cool: 'Холодная',
      neutral: 'Нейтральная',
      warm: 'Тёплая',
    },
    styleOptions: {
      minimal: 'Минимализм',
      modern: 'Современный',
      vibrant: 'Яркий',
      luxury: 'Люкс',
    },
  },
  en: {
    title: 'Mood Board → DNA',
    subtitle: 'Upload reference images and AI will recommend a cinematic style',
    uploadBtn: 'Upload images',
    analyzing: 'Analyzing...',
    maxImages: 'Maximum 10 images',
    removeImage: 'Remove',
    analyzeBtn: 'Analyze style',
    recommendedDna: 'Recommended style',
    mood: 'Mood',
    energy: 'Energy',
    temperature: 'Temperature',
    style: 'Style',
    confidence: 'Confidence',
    applyDna: 'Apply style',
    moodOptions: {
      calm: 'Calm',
      balanced: 'Balanced',
      energetic: 'Energetic',
      dramatic: 'Dramatic',
    },
    energyOptions: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
    temperatureOptions: {
      cool: 'Cool',
      neutral: 'Neutral',
      warm: 'Warm',
    },
    styleOptions: {
      minimal: 'Minimal',
      modern: 'Modern',
      vibrant: 'Vibrant',
      luxury: 'Luxury',
    },
  },
  hy: {
    title: 'Mood Board → DNA',
    subtitle: 'Upload reference images and AI will recommend a cinematic style',
    uploadBtn: 'Upload images',
    analyzing: 'Analyzing...',
    maxImages: 'Maximum 10 images',
    removeImage: 'Remove',
    analyzeBtn: 'Analyze style',
    recommendedDna: 'Recommended style',
    mood: 'Mood',
    energy: 'Energy',
    temperature: 'Temperature',
    style: 'Style',
    confidence: 'Confidence',
    applyDna: 'Apply style',
    moodOptions: {
      calm: 'Calm',
      balanced: 'Balanced',
      energetic: 'Energetic',
      dramatic: 'Dramatic',
    },
    energyOptions: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
    temperatureOptions: {
      cool: 'Cool',
      neutral: 'Neutral',
      warm: 'Warm',
    },
    styleOptions: {
      minimal: 'Minimal',
      modern: 'Modern',
      vibrant: 'Vibrant',
      luxury: 'Luxury',
    },
  },
};

export function MoodBoardUploader({ locale, onDnaRecommended }: MoodBoardUploaderProps) {
  const t = translations[locale];
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    mood: {
      energy: 'low' | 'medium' | 'high';
      mood: 'calm' | 'balanced' | 'energetic' | 'dramatic';
      temperature: 'cool' | 'neutral' | 'warm';
      style: 'minimal' | 'modern' | 'vibrant' | 'luxury';
      confidence: number;
    };
    recommendedDna: { id: string; label: string; description: string };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files].slice(0, 10);
    setImages(newImages);

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const analyzeMood = async () => {
    if (images.length === 0) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('images', img));

      const response = await fetch('/api/mood-board', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Mood board analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyDna = () => {
    if (result?.recommendedDna) {
      onDnaRecommended?.(result.recommendedDna.id);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t.subtitle}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mb-4 grid grid-cols-5 gap-2">
        {previews.map((preview, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
            <img src={preview} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              title={t.removeImage}
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {previews.length < 10 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
          </button>
        )}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">{t.maxImages}</p>

      <Button
        onClick={analyzeMood}
        disabled={images.length === 0 || analyzing}
        className="mb-4 w-full"
        size="sm"
      >
        {analyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.analyzing}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            {t.analyzeBtn}
          </>
        )}
      </Button>

      {result && (
        <div className="space-y-3 border-t border-border/60 pt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.recommendedDna}</label>
            <div className="mt-1 rounded-lg border border-primary/30 bg-primary/5 p-2">
              <p className="text-sm font-semibold">{result.recommendedDna.label}</p>
              <p className="text-xs text-muted-foreground">{result.recommendedDna.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.mood}</label>
              <div className="mt-1 text-sm">{t.moodOptions[result.mood.mood]}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.energy}</label>
              <div className="mt-1 text-sm">{t.energyOptions[result.mood.energy]}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.temperature}</label>
              <div className="mt-1 text-sm">{t.temperatureOptions[result.mood.temperature]}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.style}</label>
              <div className="mt-1 text-sm">{t.styleOptions[result.mood.style]}</div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.confidence}</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round(result.mood.confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold">{Math.round(result.mood.confidence * 100)}%</span>
            </div>
          </div>

          <Button onClick={applyDna} className="w-full" size="sm">
            {t.applyDna}
          </Button>
        </div>
      )}
    </Card>
  );
}
