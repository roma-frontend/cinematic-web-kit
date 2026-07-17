import 'server-only';

export type DnaDirector =
  | 'nolan'
  | 'villeneuve'
  | 'anderson'
  | 'kubrick'
  | 'tarantino'
  | 'miyazaki'
  | 'fincher'
  | 'wong'
  | 'custom';

export interface CinematicDna {
  id: string;
  director: DnaDirector;
  label: string;
  description: string;
  lens: string;
  lighting: string;
  colorGrade: string;
  filmStock: string;
  mood: string;
  motion: string;
  themeAffinity: string[];
  keywords: string[];
}

export const DNA_PRESETS: CinematicDna[] = [
  {
    id: 'nolan',
    director: 'nolan',
    label: 'Christopher Nolan',
    description: 'Эпический масштаб, нелинейное время, IMAX-эстетика',
    lens: 'IMAX 70mm lens, ultra-wide 15mm, deep focus, architectural scale',
    lighting: 'practical lighting, natural sunlight through massive windows, stark contrast',
    colorGrade: 'desaturated teal and amber, crushed blacks, high dynamic range',
    filmStock: 'shot on IMAX 65mm and Panavision anamorphic, organic grain',
    mood: 'epic, cerebral, time-bending, monumental',
    motion: 'slow deliberate camera moves, rotating corridors, zero gravity',
    themeAffinity: ['tech-saas', 'modern-clean'],
    keywords: ['время', 'time', 'масштаб', 'scale', 'эпик', 'epic', 'архитектур', 'architectur', 'космос', 'space', 'наука', 'science'],
  },
  {
    id: 'villeneuve',
    director: 'villeneuve',
    label: 'Denis Villeneuve',
    description: 'Медитативный sci-fi, пустота, монументальность',
    lens: 'wide 24mm lens, vast negative space, minimalist composition',
    lighting: 'diffused overcast light, fog, volumetric god rays, silhouette',
    colorGrade: 'muted earth tones, ochre and sand, lifted blacks, atmospheric haze',
    filmStock: 'shot on ARRI Alexa 65, pristine digital clarity with subtle grain',
    mood: 'contemplative, alien, monumental silence, existential awe',
    motion: 'extremely slow push-ins, static wide shots, patient observation',
    themeAffinity: ['luxury-dark', 'nature-fresh'],
    keywords: ['пустын', 'desert', 'молчан', 'silence', 'медит', 'meditat', 'философ', 'philosoph', 'космос', 'space', 'будущ', 'future'],
  },
  {
    id: 'anderson',
    director: 'anderson',
    label: 'Wes Anderson',
    description: 'Идеальная симметрия, пастель, кукольная эстетика',
    lens: '27mm lens, flat perspective, perfectly centered symmetrical composition',
    lighting: 'flat even lighting, soft diffused daylight, no harsh shadows',
    colorGrade: 'pastel storybook palette, warm yellows, soft pinks, mint greens',
    filmStock: 'shot on 35mm, fine grain, vintage color reproduction',
    mood: 'whimsical, precise, storybook charm, nostalgic perfection',
    motion: 'lateral tracking shots, whip pans, perfectly timed choreography',
    themeAffinity: ['editorial-coffee', 'modern-clean'],
    keywords: ['симметр', 'symmetr', 'пастел', 'pastel', 'ретро', 'retro', 'винтаж', 'vintage', 'сказ', 'story', 'детск', 'child'],
  },
  {
    id: 'kubrick',
    director: 'kubrick',
    label: 'Stanley Kubrick',
    description: 'Одно-точечная перспектива, холодная точность',
    lens: 'wide 18mm lens, one-point perspective, vanishing point centered',
    lighting: 'natural light through windows, practical lamps, stark fluorescent',
    colorGrade: 'cold desaturated palette, clinical whites, deep reds, stark contrast',
    filmStock: 'shot on 35mm with NASA lenses, razor-sharp detail',
    mood: 'unsettling, precise, psychological tension, controlled chaos',
    motion: 'slow steady Steadicam, symmetrical tracking, hypnotic repetition',
    themeAffinity: ['tech-saas', 'luxury-dark'],
    keywords: ['психолог', 'psycholog', 'контрол', 'control', 'точност', 'precis', 'холод', 'cold', 'напряж', 'tension', 'порядок', 'order'],
  },
  {
    id: 'tarantino',
    director: 'tarantino',
    label: 'Quentin Tarantino',
    description: 'Ретро-шик, диалоги, насилие как искусство',
    lens: 'anamorphic 40mm, crash zooms, dutch angles, close-up faces',
    lighting: 'warm practical lights, neon signs, golden hour, high contrast',
    colorGrade: 'saturated reds and yellows, vintage 70s film look, rich blacks',
    filmStock: 'shot on 35mm Kodak Vision3, organic grain, vintage color',
    mood: 'cool, dangerous, witty, retro-cool, explosive energy',
    motion: 'dynamic whip pans, crash zooms, long takes with sudden cuts',
    themeAffinity: ['sport-dynamic', 'neon-night'],
    keywords: ['ретро', 'retro', '70-е', '70s', 'крут', 'cool', 'опасн', 'danger', 'диалог', 'dialog', 'стиль', 'style', 'дерзк', 'bold'],
  },
  {
    id: 'miyazaki',
    director: 'miyazaki',
    label: 'Hayao Miyazaki',
    description: 'Аниме-эстетика, природа, полёт, магия повседневности',
    lens: 'wide establishing shots, intimate close-ups, flying sequences',
    lighting: 'golden hour, dappled sunlight through trees, magical glow',
    colorGrade: 'lush greens, sky blues, warm earth tones, vibrant yet natural',
    filmStock: 'hand-drawn animation aesthetic, soft edges, painterly quality',
    mood: 'magical, nostalgic, gentle wonder, flight and freedom',
    motion: 'soaring flight sequences, gentle wind, floating particles',
    themeAffinity: ['nature-fresh', 'editorial-coffee'],
    keywords: ['природ', 'nature', 'полёт', 'flight', 'маги', 'magic', 'детств', 'childhood', 'мечт', 'dream', 'сказ', 'fairy', 'аним', 'anim'],
  },
  {
    id: 'fincher',
    director: 'fincher',
    label: 'David Fincher',
    description: 'Тёмная элегантность, перфекционизм, цифровой нуар',
    lens: 'anamorphic 35mm, shallow depth of field, precise framing',
    lighting: 'low-key lighting, practical sources, green-tinted fluorescents',
    colorGrade: 'desaturated greens and yellows, crushed blacks, digital precision',
    filmStock: 'shot on RED digital, ultra-sharp, no grain, clinical clarity',
    mood: 'dark, obsessive, elegant menace, psychological depth',
    motion: 'smooth mechanical moves, perfect repeatability, controlled precision',
    themeAffinity: ['luxury-dark', 'tech-saas'],
    keywords: ['тёмн', 'dark', 'нуар', 'noir', 'перфек', 'perfect', 'элегант', 'elegant', 'психолог', 'psycholog', 'цифр', 'digital', 'точн', 'precis'],
  },
  {
    id: 'wong',
    director: 'wong',
    label: 'Wong Kar-wai',
    description: 'Неоновый романтизм, время, память, одиночество',
    lens: 'wide 24mm, step-printing, slow shutter, motion blur',
    lighting: 'neon signs, practical lamps, colored gels, night city glow',
    colorGrade: 'saturated neons, warm reds and greens, lifted blacks, dreamy haze',
    filmStock: 'shot on 35mm with expired film, heavy grain, color shifts',
    mood: 'romantic, melancholic, urban loneliness, time standing still',
    motion: 'slow motion, step-printing, trailing lights, frozen moments',
    themeAffinity: ['neon-night', 'luxury-dark'],
    keywords: ['неон', 'neon', 'ночь', 'night', 'город', 'city', 'романт', 'romantic', 'одиноч', 'lonely', 'памят', 'memory', 'время', 'time', 'меланхол', 'melanchol'],
  },
];

export function getDna(id: string): CinematicDna | undefined {
  return DNA_PRESETS.find((d) => d.id === id);
}

export function pickDnaFromBrief(brief: string): CinematicDna {
  const text = (brief || '').toLowerCase();
  let best = DNA_PRESETS[0];
  let bestScore = 0;
  for (const dna of DNA_PRESETS) {
    let score = 0;
    for (const kw of dna.keywords) {
      if (text.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = dna;
    }
  }
  return best;
}

export function dnaToPromptLayers(dna: CinematicDna): {
  lens: string;
  lighting: string;
  colorGrade: string;
  filmStock: string;
  mood: string;
  motion: string;
} {
  return {
    lens: dna.lens,
    lighting: dna.lighting,
    colorGrade: dna.colorGrade,
    filmStock: dna.filmStock,
    mood: dna.mood,
    motion: dna.motion,
  };
}

export function dnaConsistencyCheck(
  dna: CinematicDna,
  themeId: string,
): { score: number; suggestions: string[] } {
  const affinity = dna.themeAffinity;
  const match = affinity.includes(themeId);
  const score = match ? 100 : 60;
  const suggestions: string[] = [];
  if (!match && affinity.length > 0) {
    suggestions.push(`Тема "${themeId}" не оптимальна для стиля ${dna.label}. Попробуйте: ${affinity.join(', ')}`);
  }
  return { score, suggestions };
}

export function getDnaFromMood(mood: {
  energy: 'low' | 'medium' | 'high';
  mood: 'calm' | 'balanced' | 'energetic' | 'dramatic';
  temperature: 'cool' | 'neutral' | 'warm';
  style: 'minimal' | 'modern' | 'vibrant' | 'luxury';
}): CinematicDna {
  const { energy, mood: moodType, temperature, style } = mood;

  if (style === 'luxury') {
    return temperature === 'cool' ? DNA_PRESETS.find((d) => d.id === 'fincher')! : DNA_PRESETS.find((d) => d.id === 'villeneuve')!;
  }

  if (style === 'minimal') {
    return DNA_PRESETS.find((d) => d.id === 'fincher')!;
  }

  if (moodType === 'calm') {
    return temperature === 'cool' ? DNA_PRESETS.find((d) => d.id === 'villeneuve')! : DNA_PRESETS.find((d) => d.id === 'miyazaki')!;
  }

  if (moodType === 'balanced') {
    return DNA_PRESETS.find((d) => d.id === 'anderson')!;
  }

  if (moodType === 'energetic') {
    return temperature === 'warm' ? DNA_PRESETS.find((d) => d.id === 'tarantino')! : DNA_PRESETS.find((d) => d.id === 'nolan')!;
  }

  if (moodType === 'dramatic') {
    if (temperature === 'cool') return DNA_PRESETS.find((d) => d.id === 'kubrick')!;
    if (style === 'vibrant') return DNA_PRESETS.find((d) => d.id === 'wong')!;
    return DNA_PRESETS.find((d) => d.id === 'wong')!;
  }

  return DNA_PRESETS.find((d) => d.id === 'anderson')!;
}
