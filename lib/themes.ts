// Theme Engine: a small library of whole-page design themes. A brief (or the
// page content) is mapped to a theme via `pickTheme`, and `ThemeStyle` applies
// the theme's palette / radius / display font as CSS variables at render time.
//
// This is what makes the generated site look *appropriate* for its topic:
// coffee → warm editorial, a football match → bold dynamic, SaaS → clean tech,
// instead of every site sharing one hard-coded look.

export type DisplayFont = 'serif' | 'grotesk' | 'sans';
export type Motion = 'soft' | 'snappy' | 'dramatic';

export interface Theme {
  id: string;
  label: string;
  /** Lowercase keywords (ru + en) that route a brief to this theme. */
  keywords: string[];
  /** CSS custom-property values (inside of `oklch(...)`) per color scheme. */
  light: Record<string, string>;
  dark: Record<string, string>;
  radius: string;
  fontDisplay: DisplayFont;
  motion: Motion;
}

const VARS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'muted',
  'muted-foreground',
  'border',
] as const;

export const THEMES: Theme[] = [
  {
    id: 'modern-clean',
    label: 'Modern Clean',
    keywords: [],
    radius: '0.75rem',
    fontDisplay: 'sans',
    motion: 'soft',
    light: {
      background: '1 0 0',
      foreground: '0.15 0.01 260',
      card: '0.99 0 0',
      'card-foreground': '0.15 0.01 260',
      popover: '1 0 0',
      'popover-foreground': '0.15 0.01 260',
      primary: '0.55 0.18 265',
      'primary-foreground': '0.98 0 0',
      muted: '0.96 0.005 260',
      'muted-foreground': '0.5 0.01 260',
      border: '0.9 0.005 260',
    },
    dark: {
      background: '0.16 0.008 265',
      foreground: '0.97 0 0',
      card: '0.2 0.01 265',
      'card-foreground': '0.97 0 0',
      popover: '0.2 0.01 265',
      'popover-foreground': '0.97 0 0',
      primary: '0.68 0.16 265',
      'primary-foreground': '0.16 0.008 265',
      muted: '0.26 0.01 265',
      'muted-foreground': '0.7 0.01 265',
      border: '1 0 0 / 0.1',
    },
  },
  {
    id: 'editorial-coffee',
    label: 'Editorial Coffee',
    keywords: ['кофе', 'эспрессо', 'латте', 'капучино', 'зёрна', 'зерна', 'обжарка', 'бариста', 'пекарн', 'выпечк', 'десерт', 'ресторан', 'кафе', 'чай', 'вино', 'еда', 'coffee', 'espresso', 'latte', 'cappuccino', 'beans', 'roast', 'barista', 'bakery', 'dessert', 'restaurant', 'cafe', 'tea', 'wine', 'food'],
    radius: '0.625rem',
    fontDisplay: 'serif',
    motion: 'soft',
    light: {
      background: '0.99 0.012 75',
      foreground: '0.2 0.02 50',
      card: '0.975 0.014 75',
      'card-foreground': '0.2 0.02 50',
      popover: '0.99 0.01 75',
      'popover-foreground': '0.2 0.02 50',
      primary: '0.5 0.11 55',
      'primary-foreground': '0.99 0.01 75',
      muted: '0.95 0.016 70',
      'muted-foreground': '0.45 0.03 55',
      border: '0.88 0.02 65',
    },
    dark: {
      background: '0.17 0.015 50',
      foreground: '0.96 0.01 75',
      card: '0.21 0.018 50',
      'card-foreground': '0.96 0.01 75',
      popover: '0.21 0.018 50',
      'popover-foreground': '0.96 0.01 75',
      primary: '0.72 0.12 65',
      'primary-foreground': '0.17 0.015 50',
      muted: '0.27 0.02 50',
      'muted-foreground': '0.72 0.02 65',
      border: '1 0 0 / 0.1',
    },
  },
  {
    id: 'sport-dynamic',
    label: 'Sport Dynamic',
    keywords: ['матч', 'футбол', 'спорт', 'гол', 'чемпион', 'лига', 'турнир', 'стадион', 'команда', 'фитнес', 'зал', 'гонк', 'бег', 'баскетбол', 'хоккей', 'sport', 'football', 'soccer', 'match', 'goal', 'league', 'tournament', 'stadium', 'team', 'fitness', 'gym', 'race', 'running', 'basketball', 'hockey', 'esports'],
    radius: '0.25rem',
    fontDisplay: 'grotesk',
    motion: 'snappy',
    light: {
      background: '1 0 0',
      foreground: '0.12 0.02 260',
      card: '0.98 0 0',
      'card-foreground': '0.12 0.02 260',
      popover: '1 0 0',
      'popover-foreground': '0.12 0.02 260',
      primary: '0.6 0.23 27',
      'primary-foreground': '0.99 0 0',
      muted: '0.95 0.01 250',
      'muted-foreground': '0.45 0.02 260',
      border: '0.9 0.01 260',
    },
    dark: {
      background: '0.13 0.01 260',
      foreground: '0.98 0 0',
      card: '0.17 0.012 260',
      'card-foreground': '0.98 0 0',
      popover: '0.17 0.012 260',
      'popover-foreground': '0.98 0 0',
      primary: '0.66 0.22 27',
      'primary-foreground': '0.1 0.01 260',
      muted: '0.24 0.015 260',
      'muted-foreground': '0.72 0.02 260',
      border: '1 0 0 / 0.12',
    },
  },
  {
    id: 'tech-saas',
    label: 'Tech SaaS',
    keywords: ['saas', 'стартап', 'startup', 'приложение', 'app', 'платформа', 'platform', 'технолог', 'tech', 'ai', 'ии', 'нейросет', 'dashboard', 'аналитик', 'crypto', 'крипто', 'финтех', 'fintech', 'облак', 'cloud', 'devtool', 'api'],
    radius: '0.75rem',
    fontDisplay: 'grotesk',
    motion: 'snappy',
    light: {
      background: '1 0 0',
      foreground: '0.15 0.02 275',
      card: '0.99 0 0',
      'card-foreground': '0.15 0.02 275',
      popover: '1 0 0',
      'popover-foreground': '0.15 0.02 275',
      primary: '0.58 0.2 280',
      'primary-foreground': '0.99 0 0',
      muted: '0.96 0.008 280',
      'muted-foreground': '0.5 0.02 280',
      border: '0.9 0.01 280',
    },
    dark: {
      background: '0.15 0.015 280',
      foreground: '0.97 0 0',
      card: '0.19 0.018 280',
      'card-foreground': '0.97 0 0',
      popover: '0.19 0.018 280',
      'popover-foreground': '0.97 0 0',
      primary: '0.68 0.18 285',
      'primary-foreground': '0.15 0.015 280',
      muted: '0.25 0.02 280',
      'muted-foreground': '0.72 0.02 285',
      border: '1 0 0 / 0.1',
    },
  },
  {
    id: 'luxury-dark',
    label: 'Luxury Dark',
    keywords: ['люкс', 'luxury', 'премиум', 'premium', 'ювелир', 'jewelry', 'часы', 'watch', 'мода', 'fashion', 'бутик', 'boutique', 'отель', 'hotel', 'авто', 'car', 'яхт', 'yacht', 'парфюм', 'perfume', 'эксклюзив'],
    radius: '0.5rem',
    fontDisplay: 'serif',
    motion: 'dramatic',
    light: {
      background: '0.98 0.005 90',
      foreground: '0.18 0.01 80',
      card: '0.96 0.008 90',
      'card-foreground': '0.18 0.01 80',
      popover: '0.98 0.005 90',
      'popover-foreground': '0.18 0.01 80',
      primary: '0.62 0.12 85',
      'primary-foreground': '0.15 0.01 80',
      muted: '0.93 0.01 85',
      'muted-foreground': '0.45 0.02 85',
      border: '0.87 0.015 85',
    },
    dark: {
      background: '0.12 0.008 70',
      foreground: '0.95 0.01 85',
      card: '0.16 0.01 70',
      'card-foreground': '0.95 0.01 85',
      popover: '0.16 0.01 70',
      'popover-foreground': '0.95 0.01 85',
      primary: '0.82 0.13 88',
      'primary-foreground': '0.12 0.008 70',
      muted: '0.22 0.012 70',
      'muted-foreground': '0.74 0.02 85',
      border: '1 0 0 / 0.12',
    },
  },
];

export const DEFAULT_THEME = THEMES[0];

/** Map a font role to its CSS variable (fonts are loaded in layout.tsx). */
export const FONT_VAR: Record<DisplayFont, string> = {
  serif: 'var(--font-serif)',
  grotesk: 'var(--font-grotesk)',
  sans: 'var(--font-sans)',
};

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

/**
 * Pick the best-fitting theme for a free-text brief by counting keyword hits.
 * Falls back to the neutral modern theme when nothing matches. (Swap for an LLM
 * classifier later to handle arbitrary prompts.)
 */
export function pickTheme(brief: string): Theme {
  const text = (brief || '').toLowerCase();
  let best: Theme = DEFAULT_THEME;
  let bestScore = 0;
  for (const theme of THEMES) {
    let score = 0;
    for (const kw of theme.keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = theme;
    }
  }
  return best;
}

/** Build the CSS text (`:root` + `.dark`) that applies a theme's tokens. */
export function themeCss(theme: Theme): string {
  const block = (scheme: Record<string, string>) =>
    VARS.map((name) => `--${name}: oklch(${scheme[name]});`).join('');
  const shared = `--radius: ${theme.radius}; --font-display: ${FONT_VAR[theme.fontDisplay]};`;
  return `:root{${block(theme.light)}${shared}} .dark{${block(theme.dark)}${shared}}`;
}
