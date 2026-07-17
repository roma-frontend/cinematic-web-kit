export type InteractionType =
  | 'none'
  | 'parallax'
  | 'scroll-zoom'
  | 'mouse-tilt'
  | 'gyroscope'
  | 'scroll-fade'
  | 'scroll-rotate'
  | 'mouse-glow';

export interface SceneInteraction {
  type: InteractionType;
  intensity: number;
  smoothing: number;
  axis?: 'x' | 'y' | 'both';
}

export interface InteractionPreset {
  label: { ru: string; en: string; hy: string };
  description: { ru: string; en: string; hy: string };
}

export const INTERACTION_PRESETS: Record<
  InteractionType,
  InteractionPreset
> = {
  none: {
    label: { ru: 'Без интерактивности', en: 'No interactivity', hy: 'No interactivity' },
    description: { ru: 'Статичная сцена', en: 'Static scene', hy: 'Static scene' },
  },
  parallax: {
    label: { ru: 'Параллакс', en: 'Parallax', hy: 'Parallax' },
    description: { ru: 'Слои движутся с разной скоростью при скролле', en: 'Layers move at different speeds on scroll', hy: 'Layers move at different speeds on scroll' },
  },
  'scroll-zoom': {
    label: { ru: 'Zoom при скролле', en: 'Scroll zoom', hy: 'Scroll zoom' },
    description: { ru: 'Камера приближается/удаляется при скролле', en: 'Camera zooms in/out on scroll', hy: 'Camera zooms in/out on scroll' },
  },
  'mouse-tilt': {
    label: { ru: 'Наклон по мыши', en: 'Mouse tilt', hy: 'Mouse tilt' },
    description: { ru: 'Сцена наклоняется вслед за курсором', en: 'Scene tilts following the cursor', hy: 'Scene tilts following the cursor' },
  },
  gyroscope: {
    label: { ru: 'Гироскоп', en: 'Gyroscope', hy: 'Gyroscope' },
    description: { ru: 'Реагирует на наклон устройства (мобильные)', en: 'Responds to device tilt (mobile)', hy: 'Responds to device tilt (mobile)' },
  },
  'scroll-fade': {
    label: { ru: 'Fade при скролле', en: 'Scroll fade', hy: 'Scroll fade' },
    description: { ru: 'Прозрачность меняется при скролле', en: 'Opacity changes on scroll', hy: 'Opacity changes on scroll' },
  },
  'scroll-rotate': {
    label: { ru: 'Вращение при скролле', en: 'Scroll rotate', hy: 'Scroll rotate' },
    description: { ru: 'Сцена вращается при скролле', en: 'Scene rotates on scroll', hy: 'Scene rotates on scroll' },
  },
  'mouse-glow': {
    label: { ru: 'Свечение по мыши', en: 'Mouse glow', hy: 'Mouse glow' },
    description: { ru: 'Световое пятно следует за курсором', en: 'Light spot follows the cursor', hy: 'Light spot follows the cursor' },
  },
};

export function getInteractionTransform(
  interaction: SceneInteraction,
  scrollProgress: number,
  mouseX: number,
  mouseY: number
): string {
  const { type, intensity, axis = 'both' } = interaction;
  const smoothScroll = scrollProgress;

  switch (type) {
    case 'none':
      return '';

    case 'parallax': {
      const yOffset = smoothScroll * intensity * 100;
      return `transform: translateY(${yOffset}px);`;
    }

    case 'scroll-zoom': {
      const scale = 1 + smoothScroll * intensity * 0.5;
      return `transform: scale(${scale});`;
    }

    case 'mouse-tilt': {
      const rotateX = (mouseY - 0.5) * intensity * 20;
      const rotateY = (mouseX - 0.5) * intensity * 20;
      const x = axis === 'y' ? 0 : rotateY;
      const y = axis === 'x' ? 0 : rotateX;
      return `transform: perspective(1000px) rotateX(${y}deg) rotateY(${x}deg);`;
    }

    case 'gyroscope': {
      return `transform: perspective(1000px) rotateX(${mouseY * intensity * 10}deg) rotateY(${mouseX * intensity * 10}deg);`;
    }

    case 'scroll-fade': {
      const opacity = 1 - smoothScroll * intensity;
      return `opacity: ${Math.max(0, opacity)};`;
    }

    case 'scroll-rotate': {
      const rotation = smoothScroll * intensity * 360;
      return `transform: rotate(${rotation}deg);`;
    }

    case 'mouse-glow': {
      const x = mouseX * 100;
      const y = mouseY * 100;
      return `background: radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,${intensity * 0.3}), transparent 50%);`;
    }

    default:
      return '';
  }
}
