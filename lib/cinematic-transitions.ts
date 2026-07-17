export type TransitionType =
  | 'none'
  | 'fade'
  | 'dolly-zoom'
  | 'rack-focus'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'match-cut'
  | 'dissolve'
  | 'zoom-in'
  | 'zoom-out';

export interface CinematicTransition {
  type: TransitionType;
  duration: number;
  easing: string;
  delay?: number;
}

export interface TransitionPreset {
  label: { ru: string; en: string; hy: string };
  description: { ru: string; en: string; hy: string };
}

export const TRANSITION_PRESETS: Record<TransitionType, TransitionPreset> = {
  none: {
    label: { ru: 'Без перехода', en: 'No transition', hy: 'No transition' },
    description: { ru: 'Мгновенная смена секций', en: 'Instant section change', hy: 'Instant section change' },
  },
  fade: {
    label: { ru: 'Плавное затухание', en: 'Fade', hy: 'Fade' },
    description: { ru: 'Классический fade in/out', en: 'Classic fade in/out', hy: 'Classic fade in/out' },
  },
  'dolly-zoom': {
    label: { ru: 'Dolly Zoom', en: 'Dolly Zoom', hy: 'Dolly Zoom' },
    description: { ru: 'Эффект Vertigo - камера движется вперёд, зум назад', en: 'Vertigo effect - camera moves forward, zoom back', hy: 'Vertigo effect - camera moves forward, zoom back' },
  },
  'rack-focus': {
    label: { ru: 'Rack Focus', en: 'Rack Focus', hy: 'Rack Focus' },
    description: { ru: 'Перевод фокуса с одной секции на другую', en: 'Focus shift from one section to another', hy: 'Focus shift from one section to another' },
  },
  'wipe-left': {
    label: { ru: 'Wipe влево', en: 'Wipe left', hy: 'Wipe left' },
    description: { ru: 'Горизонтальная шторка слева направо', en: 'Horizontal wipe from left to right', hy: 'Horizontal wipe from left to right' },
  },
  'wipe-right': {
    label: { ru: 'Wipe вправо', en: 'Wipe right', hy: 'Wipe right' },
    description: { ru: 'Горизонтальная шторка справа налево', en: 'Horizontal wipe from right to left', hy: 'Horizontal wipe from right to left' },
  },
  'wipe-up': {
    label: { ru: 'Wipe вверх', en: 'Wipe up', hy: 'Wipe up' },
    description: { ru: 'Вертикальная шторка снизу вверх', en: 'Vertical wipe from bottom to top', hy: 'Vertical wipe from bottom to top' },
  },
  'wipe-down': {
    label: { ru: 'Wipe вниз', en: 'Wipe down', hy: 'Wipe down' },
    description: { ru: 'Вертикальная шторка сверху вниз', en: 'Vertical wipe from top to bottom', hy: 'Vertical wipe from top to bottom' },
  },
  'match-cut': {
    label: { ru: 'Match Cut', en: 'Match Cut', hy: 'Match Cut' },
    description: { ru: 'Переход по совпадению формы или цвета', en: 'Transition by matching shape or color', hy: 'Transition by matching shape or color' },
  },
  dissolve: {
    label: { ru: 'Растворение', en: 'Dissolve', hy: 'Dissolve' },
    description: { ru: 'Плавное наложение одной секции на другую', en: 'Smooth overlay of one section onto another', hy: 'Smooth overlay of one section onto another' },
  },
  'zoom-in': {
    label: { ru: 'Zoom In', en: 'Zoom In', hy: 'Zoom In' },
    description: { ru: 'Увеличение с переходом', en: 'Zoom in with transition', hy: 'Zoom in with transition' },
  },
  'zoom-out': {
    label: { ru: 'Zoom Out', en: 'Zoom Out', hy: 'Zoom Out' },
    description: { ru: 'Уменьшение с переходом', en: 'Zoom out with transition', hy: 'Zoom out with transition' },
  },
};

export function getTransitionCss(
  transition: CinematicTransition,
  phase: 'enter' | 'exit'
): string {
  const { type, duration, easing } = transition;

  const baseTransition = `all ${duration}ms ${easing}`;

  switch (type) {
    case 'none':
      return '';

    case 'fade':
      return phase === 'enter'
        ? `opacity: 0; transition: ${baseTransition};`
        : `opacity: 1; transition: ${baseTransition};`;

    case 'dolly-zoom':
      return phase === 'enter'
        ? `transform: scale(1.2); opacity: 0; transition: ${baseTransition};`
        : `transform: scale(1); opacity: 1; transition: ${baseTransition};`;

    case 'rack-focus':
      return phase === 'enter'
        ? `filter: blur(10px); opacity: 0; transition: ${baseTransition};`
        : `filter: blur(0); opacity: 1; transition: ${baseTransition};`;

    case 'wipe-left':
      return phase === 'enter'
        ? `transform: translateX(-100%); transition: ${baseTransition};`
        : `transform: translateX(0); transition: ${baseTransition};`;

    case 'wipe-right':
      return phase === 'enter'
        ? `transform: translateX(100%); transition: ${baseTransition};`
        : `transform: translateX(0); transition: ${baseTransition};`;

    case 'wipe-up':
      return phase === 'enter'
        ? `transform: translateY(100%); transition: ${baseTransition};`
        : `transform: translateY(0); transition: ${baseTransition};`;

    case 'wipe-down':
      return phase === 'enter'
        ? `transform: translateY(-100%); transition: ${baseTransition};`
        : `transform: translateY(0); transition: ${baseTransition};`;

    case 'match-cut':
      return phase === 'enter'
        ? `transform: scale(0.8) rotate(-5deg); opacity: 0; transition: ${baseTransition};`
        : `transform: scale(1) rotate(0); opacity: 1; transition: ${baseTransition};`;

    case 'dissolve':
      return phase === 'enter'
        ? `opacity: 0; mix-blend-mode: screen; transition: ${baseTransition};`
        : `opacity: 1; mix-blend-mode: normal; transition: ${baseTransition};`;

    case 'zoom-in':
      return phase === 'enter'
        ? `transform: scale(0.5); opacity: 0; transition: ${baseTransition};`
        : `transform: scale(1); opacity: 1; transition: ${baseTransition};`;

    case 'zoom-out':
      return phase === 'enter'
        ? `transform: scale(1.5); opacity: 0; transition: ${baseTransition};`
        : `transform: scale(1); opacity: 1; transition: ${baseTransition};`;

    default:
      return '';
  }
}
