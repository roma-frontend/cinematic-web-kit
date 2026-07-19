'use client';

import { useState } from 'react';
import { Wand2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/seo';

interface BrandVoiceCardProps {
  siteId: string;
  locale: Locale;
  onVoiceAnalyzed?: () => void;
}

const translations = {
  ru: {
    title: 'Голос бренда',
    subtitle: 'AI анализирует тексты сайта и определяет стиль коммуникации',
    analyzeBtn: 'Анализировать тексты',
    analyzing: 'Анализируем...',
    noVoice: 'Голос бренда ещё не определён',
    tone: 'Тон',
    style: 'Стиль',
    audience: 'Аудитория',
    keywords: 'Ключевые слова',
    confidence: 'Уверенность',
    toneOptions: {
      formal: 'Официальный',
      casual: 'Неформальный',
      friendly: 'Дружелюбный',
      professional: 'Профессиональный',
      playful: 'Игривый',
      authoritative: 'Авторитетный',
    },
    styleOptions: {
      concise: 'Краткий',
      detailed: 'Подробный',
      storytelling: 'История',
      technical: 'Технический',
      emotional: 'Эмоциональный',
    },
    success: 'Голос бренда успешно определён!',
    error: 'Не удалось проанализировать тексты',
  },
  en: {
    title: 'Brand Voice',
    subtitle: 'AI analyzes site texts and determines communication style',
    analyzeBtn: 'Analyze texts',
    analyzing: 'Analyzing...',
    noVoice: 'Brand voice not yet defined',
    tone: 'Tone',
    style: 'Style',
    audience: 'Audience',
    keywords: 'Keywords',
    confidence: 'Confidence',
    toneOptions: {
      formal: 'Formal',
      casual: 'Casual',
      friendly: 'Friendly',
      professional: 'Professional',
      playful: 'Playful',
      authoritative: 'Authoritative',
    },
    styleOptions: {
      concise: 'Concise',
      detailed: 'Detailed',
      storytelling: 'Storytelling',
      technical: 'Technical',
      emotional: 'Emotional',
    },
    success: 'Brand voice successfully defined!',
    error: 'Failed to analyze texts',
  },
  hy: {
    title: 'Բրենդի ձայն',
    subtitle: 'AI-ն վերլուծում է կայքի տեքստերը և որոշում հաղորդակցության ոճը',
    analyzeBtn: 'Վերլուծել տեքստերը',
    analyzing: 'Վերլուծվում է...',
    noVoice: 'Բրենդի ձայնը դեռ չի սահմանվել',
    tone: 'Տոն',
    style: 'Ոճ',
    audience: 'Աուդիտորիա',
    keywords: 'Հիմնաբանական բառեր',
    confidence: 'Վստահություն',
    toneOptions: {
      formal: 'Պաշտոնական',
      casual: 'Չպաշտոնական',
      friendly: 'Ընկերական',
      professional: 'Պրոֆեսիոնալ',
      playful: 'Խաղաղ',
      authoritative: 'Աւրինական',
    },
    styleOptions: {
      concise: 'Կարճ',
      detailed: 'Մանրամասն',
      storytelling: 'Իսկապես պատմություն',
      technical: 'Տեխնիկական',
      emotional: 'Էմոցիոնալ',
    },
    success: 'Բրենդի ձայնը հաջողությամբ սահմանվել է!',
    error: 'Տեքստերը վերլուծումը ձախողվեց',
  },
};

export function BrandVoiceCard({ siteId, locale, onVoiceAnalyzed }: BrandVoiceCardProps) {
  const t = translations[locale];
  const [analyzing, setAnalyzing] = useState(false);
  const [voice, setVoice] = useState<{
    tone: string;
    style: string;
    audience: string;
    keywords: string[];
    confidence: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const analyzeVoice = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/brand-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setVoice(data.analysis);
      setSuccess(true);
      onVoiceAnalyzed?.();

      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(t.error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">{t.title}</h3>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">{t.subtitle}</p>

      {success && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {t.success}
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {voice ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.tone}</label>
            <div className="mt-1 text-sm font-semibold">
              {t.toneOptions[voice.tone as keyof typeof t.toneOptions]}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.style}</label>
            <div className="mt-1 text-sm font-semibold">
              {t.styleOptions[voice.style as keyof typeof t.styleOptions]}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.audience}</label>
            <div className="mt-1 text-sm">{voice.audience}</div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.keywords}</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {voice.keywords.slice(0, 5).map((kw: string, i: number) => (
                <span
                  key={i}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.confidence}</label>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${voice.confidence}%` }}
                />
              </div>
              <span className="text-xs font-semibold">{voice.confidence}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">{t.noVoice}</p>
        </div>
      )}

      <Button
        onClick={analyzeVoice}
        disabled={analyzing}
        className="mt-4 w-full"
        size="sm"
      >
        {analyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t.analyzing}
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            {t.analyzeBtn}
          </>
        )}
      </Button>
    </Card>
  );
}
