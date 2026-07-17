import type { BuilderDoc } from '@/lib/builder/types';
import type { Locale } from '@/lib/seo';

export interface CinematicScoreResult {
  total: number;
  breakdown: {
    dnaConsistency: number;
    videoQuality: number;
    colorHarmony: number;
    motionDesign: number;
    visualRhythm: number;
  };
  suggestions: string[];
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

const translations = {
  ru: {
    addDna: 'Добавьте Cinematic DNA для единого визуального стиля',
    addVideo: 'Добавьте видео-секции для кинематографичности',
    addMoreVideo: 'Добавьте больше видео-секций (рекомендуется 3-5)',
    addHeroVideo: 'Добавьте hero-видео в формате 16:9',
    selectTheme: 'Выберите конкретную тему вместо "Авто" для лучшей цветовой гармонии',
    addAnimations: 'Добавьте анимации и hover-эффекты для динамичности',
    increaseAnimations: 'Увеличьте количество анимированных элементов до 30-50%',
    tooManyAnimations: 'Слишком много анимаций — оставьте 30-50% для баланса',
    addSections: 'Добавьте больше секций для визуального ритма (рекомендуется 4-6)',
    alternatePadding: 'Чередуйте отступы секций (sm, md, lg) для визуального ритма',
    alternateBackgrounds: 'Чередуйте фоны секций (none, muted, primary, card) для контраста',
  },
  en: {
    addDna: 'Add Cinematic DNA for a unified visual style',
    addVideo: 'Add video sections for cinematic feel',
    addMoreVideo: 'Add more video sections (3-5 recommended)',
    addHeroVideo: 'Add hero video in 16:9 format',
    selectTheme: 'Select a specific theme instead of "Auto" for better color harmony',
    addAnimations: 'Add animations and hover effects for dynamism',
    increaseAnimations: 'Increase animated elements to 30-50%',
    tooManyAnimations: 'Too many animations — keep 30-50% for balance',
    addSections: 'Add more sections for visual rhythm (4-6 recommended)',
    alternatePadding: 'Alternate section padding (sm, md, lg) for visual rhythm',
    alternateBackgrounds: 'Alternate section backgrounds (none, muted, primary, card) for contrast',
  },
  hy: {
    addDna: 'Add Cinematic DNA for a unified visual style',
    addVideo: 'Add video sections for cinematic feel',
    addMoreVideo: 'Add more video sections (3-5 recommended)',
    addHeroVideo: 'Add hero video in 16:9 format',
    selectTheme: 'Select a specific theme instead of "Auto" for better color harmony',
    addAnimations: 'Add animations and hover effects for dynamism',
    increaseAnimations: 'Increase animated elements to 30-50%',
    tooManyAnimations: 'Too many animations — keep 30-50% for balance',
    addSections: 'Add more sections for visual rhythm (4-6 recommended)',
    alternatePadding: 'Alternate section padding (sm, md, lg) for visual rhythm',
    alternateBackgrounds: 'Alternate section backgrounds (none, muted, primary, card) for contrast',
  },
};

export function calculateCinematicScore(doc: BuilderDoc, locale: Locale = 'ru'): CinematicScoreResult {
  const t = translations[locale];
  const suggestions: string[] = [];

  const dnaConsistency = scoreDnaConsistency(doc, suggestions, t);
  const videoQuality = scoreVideoQuality(doc, suggestions, t);
  const colorHarmony = scoreColorHarmony(doc, suggestions, t);
  const motionDesign = scoreMotionDesign(doc, suggestions, t);
  const visualRhythm = scoreVisualRhythm(doc, suggestions, t);

  const total = Math.round(
    (dnaConsistency + videoQuality + colorHarmony + motionDesign + visualRhythm) / 5
  );

  const grade = total >= 90 ? 'S' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : 'D';

  return {
    total,
    breakdown: {
      dnaConsistency,
      videoQuality,
      colorHarmony,
      motionDesign,
      visualRhythm,
    },
    suggestions,
    grade,
  };
}

function scoreDnaConsistency(doc: BuilderDoc, suggestions: string[], t: typeof translations.ru): number {
  if (!doc.dnaId || doc.dnaId === 'none') {
    suggestions.push(t.addDna);
    return 40;
  }
  return 100;
}

function scoreVideoQuality(doc: BuilderDoc, suggestions: string[], t: typeof translations.ru): number {
  let videoCount = 0;
  let hasHeroVideo = false;

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === 'video' && node.props?.src) {
        videoCount++;
        if (node.props.ratio === '16:9' || node.props.ratio === '16/9') {
          hasHeroVideo = true;
        }
      }
      if (node.children) walk(node.children);
    }
  };

  doc.pages.forEach((page) => walk(page.blocks));

  if (videoCount === 0) {
    suggestions.push(t.addVideo);
    return 30;
  }

  if (videoCount < 3) {
    suggestions.push(t.addMoreVideo);
    return 60;
  }

  if (!hasHeroVideo) {
    suggestions.push(t.addHeroVideo);
    return 80;
  }

  return 100;
}

function scoreColorHarmony(doc: BuilderDoc, suggestions: string[], t: typeof translations.ru): number {
  if (!doc.themeId || doc.themeId === 'auto') {
    suggestions.push(t.selectTheme);
    return 60;
  }
  return 100;
}

function scoreMotionDesign(doc: BuilderDoc, suggestions: string[], t: typeof translations.ru): number {
  let motionCount = 0;
  let totalElements = 0;

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      totalElements++;
      if (node.props?.animName || node.props?.hvScale || node.props?.hvTranslateY) {
        motionCount++;
      }
      if (node.children) walk(node.children);
    }
  };

  doc.pages.forEach((page) => walk(page.blocks));

  if (totalElements === 0) return 50;

  const motionRatio = motionCount / totalElements;

  if (motionRatio < 0.1) {
    suggestions.push(t.addAnimations);
    return 40;
  }

  if (motionRatio < 0.3) {
    suggestions.push(t.increaseAnimations);
    return 70;
  }

  if (motionRatio > 0.7) {
    suggestions.push(t.tooManyAnimations);
    return 75;
  }

  return 100;
}

function scoreVisualRhythm(doc: BuilderDoc, suggestions: string[], t: typeof translations.ru): number {
  if (doc.pages.length === 0) return 0;

  const page = doc.pages[0];
  const sections = page.blocks.filter((b) => b.type === 'section');

  if (sections.length < 3) {
    suggestions.push(t.addSections);
    return 50;
  }

  const paddings = sections.map((s) => s.props?.padding || 'md');
  const uniquePaddings = new Set(paddings);

  if (uniquePaddings.size < 2) {
    suggestions.push(t.alternatePadding);
    return 70;
  }

  const bgs = sections.map((s) => s.props?.bg || 'none');
  const uniqueBgs = new Set(bgs);

  if (uniqueBgs.size < 3) {
    suggestions.push(t.alternateBackgrounds);
    return 75;
  }

  return 100;
}
