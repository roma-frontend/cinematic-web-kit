// Style presets for the built-in header/footer chrome buttons (auth «Войти» /
// «Начать бесплатно» / «Кабинет» and the newsletter submit). Only the LOOK is
// configurable from the builder — the hrefs of these buttons are fixed by the
// platform (/login, /register, /account, /api/form) and never editable.
// All colors go through theme tokens (primary/border/muted/…), so every
// variant automatically follows the site's selected theme.

export const CHROME_BTN_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
export const CHROME_BTN_SIZES = ['sm', 'md', 'lg'] as const;
export const CHROME_BTN_ROUNDED = ['full', 'lg', 'md'] as const;

/** Russian source labels for the editor (translated via builderTr). */
export const CHROME_BTN_VARIANT_LABELS: Record<string, string> = {
  default: 'Основная',
  secondary: 'Вторичная',
  outline: 'Контур',
  ghost: 'Прозрачная',
  destructive: 'Красная',
  link: 'Ссылка',
};
export const CHROME_BTN_ROUNDED_LABELS: Record<string, string> = {
  full: 'Пилюля',
  lg: 'Из темы', // rounded-lg = var(--radius) → follows the theme's corner radius
  md: 'Мягкое',
};

/** Header nav link styles (style only — hrefs are edited in the menu editor). */
export const NAV_STYLES = ['pills', 'underline', 'uppercase', 'plain'] as const;
export const NAV_STYLE_LABELS: Record<string, string> = {
  pills: 'Таблетки',
  underline: 'Подчёркивание',
  uppercase: 'Капс',
  plain: 'Просто текст',
};
const NAV_CLS: Record<string, string> = {
  pills: 'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
  underline: 'border-b-2 border-transparent px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground',
  uppercase: 'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
  plain: 'px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
};
export function navLinkClass(style?: string): string {
  return NAV_CLS[style ?? ''] ?? NAV_CLS.pills;
}

/** Recommended chrome-button styling per theme — the same design language the
 *  ready-made landings use. Applied when the user switches theme or presses
 *  «Подобрать под тему» in the editor. */
export const THEME_BTN_PRESETS: Record<string, {
  authLoginVariant: string; authCtaVariant: string; authBtnSize: string; authBtnRounded: string;
  footerBtnVariant: string; navStyle: string;
}> = {
  'modern-clean': { authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'sm', authBtnRounded: 'full', footerBtnVariant: 'default', navStyle: 'pills' },
  'editorial-coffee': { authLoginVariant: 'link', authCtaVariant: 'default', authBtnSize: 'sm', authBtnRounded: 'full', footerBtnVariant: 'default', navStyle: 'underline' },
  'sport-dynamic': { authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'lg', authBtnRounded: 'lg', footerBtnVariant: 'default', navStyle: 'uppercase' },
  'tech-saas': { authLoginVariant: 'ghost', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'lg', footerBtnVariant: 'default', navStyle: 'pills' },
  'luxury-dark': { authLoginVariant: 'link', authCtaVariant: 'outline', authBtnSize: 'md', authBtnRounded: 'md', footerBtnVariant: 'outline', navStyle: 'underline' },
  'neon-night': { authLoginVariant: 'outline', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'lg', footerBtnVariant: 'default', navStyle: 'pills' },
  'nature-fresh': { authLoginVariant: 'secondary', authCtaVariant: 'default', authBtnSize: 'md', authBtnRounded: 'full', footerBtnVariant: 'default', navStyle: 'pills' },
};

const VARIANT_CLS: Record<string, string> = {
  default: 'bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90',
  secondary: 'bg-muted font-medium text-foreground transition-colors hover:bg-muted/80',
  outline: 'border border-border font-medium text-foreground transition-colors hover:bg-muted',
  ghost: 'font-medium text-foreground transition-colors hover:bg-muted',
  destructive: 'bg-red-600 font-semibold text-white transition-colors hover:bg-red-700',
  link: 'font-medium text-primary underline-offset-4 transition-colors hover:underline',
};

const SIZE_CLS: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const ROUNDED_CLS: Record<string, string> = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  md: 'rounded-md',
};

/** Per-doc style config consumed by SiteAuthButtons (see BuilderDoc fields). */
export interface ChromeBtnStyles {
  login?: string; // variant of «Войти»
  cta?: string; // variant of «Начать бесплатно» / «Кабинет»
  size?: string; // shared size: sm | md | lg
  rounded?: string; // shared corner radius: full | lg | md
}

export function chromeBtnClass(variant?: string, size?: string, rounded?: string, extra = ''): string {
  const v = VARIANT_CLS[variant ?? ''] ?? VARIANT_CLS.default;
  const s = SIZE_CLS[size ?? ''] ?? SIZE_CLS.sm;
  const r = ROUNDED_CLS[rounded ?? ''] ?? ROUNDED_CLS.full;
  return `inline-flex items-center justify-center ${r} ${s} ${v}${extra ? ` ${extra}` : ''}`;
}
