export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export interface TimeAwareVariant {
  time: TimeOfDay;
  label: string;
  description: string;
  colorTemp: string;
  mood: string;
  lighting: string;
  themeOverride?: {
    primary?: string;
    background?: string;
    foreground?: string;
  };
}

export const TIME_VARIANTS: TimeAwareVariant[] = [
  {
    time: 'morning',
    label: 'Утро',
    description: 'Тёплый golden hour, мягкий свет, пробуждение',
    colorTemp: '3200K',
    mood: 'fresh, hopeful, gentle awakening',
    lighting: 'golden hour sunlight, soft warm glow, long shadows',
    themeOverride: {
      primary: '0.65 0.15 70',
      background: '0.98 0.015 75',
    },
  },
  {
    time: 'day',
    label: 'День',
    description: 'Яркий high-key, чистый свет, активность',
    colorTemp: '5600K',
    mood: 'energetic, clear, productive',
    lighting: 'bright daylight, high-key, crisp shadows',
    themeOverride: {
      primary: '0.6 0.18 260',
      background: '1 0 0',
    },
  },
  {
    time: 'evening',
    label: 'Вечер',
    description: 'Dramatic rim light, тёплые тона, завершение дня',
    colorTemp: '4200K',
    mood: 'reflective, warm, winding down',
    lighting: 'sunset rim light, warm practicals, long golden rays',
    themeOverride: {
      primary: '0.6 0.14 50',
      background: '0.95 0.02 60',
    },
  },
  {
    time: 'night',
    label: 'Ночь',
    description: 'Neon, low-key, таинственность, глубина',
    colorTemp: '7500K',
    mood: 'mysterious, intimate, neon-lit',
    lighting: 'neon glow, low-key, deep shadows, practical lamps',
    themeOverride: {
      primary: '0.65 0.2 280',
      background: '0.15 0.02 270',
      foreground: '0.95 0.01 280',
    },
  },
];

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getTimeVariant(time: TimeOfDay): TimeAwareVariant {
  return TIME_VARIANTS.find((v) => v.time === time) || TIME_VARIANTS[1];
}

export function timeAwarePromptSuffix(time: TimeOfDay): string {
  const variant = getTimeVariant(time);
  return `${variant.lighting}, ${variant.mood}`;
}

export function timeAwareCssVars(time: TimeOfDay): string {
  const variant = getTimeVariant(time);
  if (!variant.themeOverride) return '';
  const vars = Object.entries(variant.themeOverride)
    .map(([k, v]) => `--${k}: oklch(${v});`)
    .join('');
  return `:root[data-time="${time}"]{${vars}}`;
}
