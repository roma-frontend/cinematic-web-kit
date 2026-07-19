'use client';

import { useState } from 'react';
import { Film, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DNA_PRESETS, type CinematicDna } from '@/lib/cinematic-dna-client';
import type { Locale } from '@/lib/seo';

interface DnaSelectorProps {
  value: string | undefined;
  onChange: (dnaId: string) => void;
  currentThemeId: string;
  disabled?: boolean;
  locale?: Locale;
}

const translations = {
  ru: {
    placeholder: 'Кино-стиль',
    noStyle: 'Без стиля',
    titleHint: 'Выберите кинематографичный стиль',
  },
  en: {
    placeholder: 'Cinematic style',
    noStyle: 'No style',
    titleHint: 'Select cinematic style',
  },
  hy: {
    placeholder: 'Cinematic style',
    noStyle: 'No style',
    titleHint: 'Select cinematic style',
  },
};

export function DnaSelector({ value, onChange, currentThemeId, disabled, locale = 'ru' }: DnaSelectorProps) {
  const t = translations[locale];
  const [, setHoveredId] = useState<string | null>(null);

  const checkConsistency = (dna: CinematicDna) => {
    const match = dna.themeAffinity.includes(currentThemeId);
    return { score: match ? 100 : 60, match };
  };

  const selectedDna = DNA_PRESETS.find((d) => d.id === value);

  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      onOpenChange={(o) => { if (!o) setHoveredId(null); }}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-55" title={selectedDna ? `DNA: ${selectedDna.label}` : t.titleHint}>
        <Film className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder={t.placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-muted-foreground">
          <span className="italic">{t.noStyle}</span>
        </SelectItem>
        {DNA_PRESETS.map((dna) => {
          const { match } = checkConsistency(dna);
          return (
            <SelectItem
              key={dna.id}
              value={dna.id}
              onPointerEnter={() => setHoveredId(dna.id)}
              onFocus={() => setHoveredId(dna.id)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{dna.label}</span>
                {!match && (
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
