// Layered cinematic prompt engine.
//
// Turns a short brief into a studio-grade video prompt by composing distinct
// layers — subject · framing · lens · lighting · color grade · motion · mood ·
// film stock · quality — under a chosen *style preset*. A whole page shares one
// resolved style + seed so hero and cards look like one film, not stock clips.
//
// Deterministic and offline (no LLM needed). To upgrade later, swap the body of
// `composePrompt` for an LLM call and keep this as the fallback.

export type Section = 'hero' | 'background' | 'card';

export type StyleId =
  | 'auto'
  | 'teal-orange'
  | 'a24'
  | 'cyberpunk'
  | 'wes-anderson'
  | 'nature-doc'
  | 'luxury'
  | 'noir'
  | 'dreamy';

export interface StylePreset {
  id: Exclude<StyleId, 'auto'>;
  label: string;
  description: string;
  lens: string;
  lighting: string;
  colorGrade: string;
  filmStock: string;
  mood: string;
}

/** Cinematic look presets. Each layer is phrased as a video-model modifier. */
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'teal-orange',
    label: 'Блокбастер (Teal & Orange)',
    description: 'Голливудский грейд, контраст тёплого и холодного',
    lens: 'anamorphic 40mm lens, shallow depth of field, oval bokeh, subtle lens flare',
    lighting: 'dramatic rim lighting, motivated practical lights, soft key light',
    colorGrade: 'teal and orange color grade, high contrast, deep blacks, filmic HDR',
    filmStock: 'shot on ARRI Alexa, 35mm film grain',
    mood: 'epic, confident, blockbuster energy',
  },
  {
    id: 'a24',
    label: 'A24 (натуралистичный)',
    description: 'Мягкий естественный свет, тонкая палитра',
    lens: '50mm prime lens, natural shallow depth of field, gentle bokeh',
    lighting: 'soft natural window light, golden hour, delicate shadows',
    colorGrade: 'muted pastel color grade, low saturation, film-accurate skin tones',
    filmStock: 'shot on 16mm Kodak Portra, organic grain',
    mood: 'intimate, contemplative, understated',
  },
  {
    id: 'cyberpunk',
    label: 'Киберпанк (неон)',
    description: 'Неоновые огни, дождь, ночной мегаполис',
    lens: 'wide 24mm lens, deep focus, streaking neon lens flares',
    lighting: 'moody neon glow, magenta and cyan practicals, wet reflective surfaces',
    colorGrade: 'high-saturation neon color grade, crushed blacks, glowing highlights',
    filmStock: 'digital cinema, subtle chromatic aberration',
    mood: 'futuristic, electric, nocturnal',
  },
  {
    id: 'wes-anderson',
    label: 'Симметрия (Wes Anderson)',
    description: 'Идеальная симметрия, пастель, центрированный кадр',
    lens: '27mm lens, flat perspective, perfectly centered symmetrical composition',
    lighting: 'flat even lighting, soft diffused daylight',
    colorGrade: 'pastel storybook color palette, warm yellows and soft pinks',
    filmStock: 'shot on 35mm, fine grain',
    mood: 'whimsical, precise, storybook charm',
  },
  {
    id: 'nature-doc',
    label: 'Документальный (природа)',
    description: 'BBC-стиль, богатые цвета, макро-детали',
    lens: 'macro and telephoto lenses, razor-sharp focus, creamy background separation',
    lighting: 'natural golden hour light, soft volumetric fog, backlit rim',
    colorGrade: 'rich saturated color grade, lush greens, vivid detail',
    filmStock: 'shot on RED 8K, pristine clarity',
    mood: 'majestic, serene, awe-inspiring',
  },
  {
    id: 'luxury',
    label: 'Люкс (реклама премиум)',
    description: 'Глянцевый продукт, чистый свет, дорогая подача',
    lens: 'macro 100mm lens, silky shallow depth of field, elegant bokeh',
    lighting: 'high-key studio light, soft gradient backdrop, glossy reflections',
    colorGrade: 'clean premium color grade, refined contrast, subtle warmth',
    filmStock: 'ultra-high-resolution digital, flawless finish',
    mood: 'elegant, aspirational, refined',
  },
  {
    id: 'noir',
    label: 'Нуар (ч/б контраст)',
    description: 'Жёсткий свет, глубокие тени, драма',
    lens: '35mm lens, deep shadows, hard directional light',
    lighting: 'chiaroscuro lighting, venetian-blind shadows, single hard key',
    colorGrade: 'high-contrast black and white, deep blacks, silvery highlights',
    filmStock: 'classic 35mm noir film grain',
    mood: 'mysterious, tense, dramatic',
  },
  {
    id: 'dreamy',
    label: 'Мечтательный (soft glow)',
    description: 'Дымка, свечение, эфемерность',
    lens: '85mm lens, ultra-shallow depth of field, glowing bloom, soft focus edges',
    lighting: 'ethereal backlight, hazy volumetric light rays, gentle bloom',
    colorGrade: 'soft dreamy color grade, lifted blacks, pastel highlights',
    filmStock: 'shot on vintage lens, delicate halation',
    mood: 'romantic, ethereal, weightless',
  },
];

/** Shared quality tags appended to every prompt. */
const QUALITY = 'ultra-detailed, 8k, photorealistic, high dynamic range, professional cinematography, smooth motion';

/** Negative prompt — what the model should avoid. Passed alongside the prompt. */
export const NEGATIVE_PROMPT =
  'text, captions, subtitles, watermark, logo, ui, low resolution, blurry, out of focus, distorted, deformed, warped, jpeg artifacts, oversaturated, harsh flicker, jitter, extra limbs, duplicate frames, cartoon, cgi look';

/** Camera framing per section — sets the shot scale. */
const FRAMING: Record<Section, string> = {
  hero: 'sweeping cinematic wide establishing shot, epic scale, rule-of-thirds composition',
  background: 'slow immersive parallax shot, full-frame ambient composition',
  card: 'macro close-up product shot, crisp tactile detail',
};

/** Camera motion pool — adds life; seeded for variety within a page. */
const MOTION = [
  'slow motion',
  'smooth dolly-in',
  'gentle orbiting camera',
  'subtle push-in',
  'floating crane move',
  'slow tracking shot',
];

/** Stable pick from an array based on a string seed. */
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

/** Look up a preset by id. */
export function getPreset(id: Exclude<StyleId, 'auto'>): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0];
}

/** Resolve a (possibly 'auto') style into a concrete preset, seeded by the brief. */
export function resolveStyle(style: StyleId, seed: string): StylePreset {
  if (style !== 'auto') return getPreset(style);
  return pick(STYLE_PRESETS, `style-${seed}`);
}

export interface ComposeInput {
  brief: string;
  section: Section;
  style?: StyleId;
  index?: number;
  /** Shared seed so a whole page stays visually consistent. */
  seed?: string;
}

/** Compose one layered cinematic prompt from a brief + section + style. */
export function composePrompt({ brief, section, style = 'auto', index = 0, seed }: ComposeInput): string {
  const subject = brief.trim().replace(/\.$/, '');
  if (!subject) return '';
  const s = seed ?? subject;
  const preset = resolveStyle(style, s);
  const motion = pick(MOTION, `${s}-${section}-${index}-m`);

  return [
    FRAMING[section],
    `of ${subject}`,
    preset.lens,
    preset.lighting,
    preset.colorGrade,
    motion,
    preset.mood,
    preset.filmStock,
    QUALITY,
  ]
    .filter(Boolean)
    .join(', ');
}

export interface PlanItem {
  section: Section;
  title: string;
  prompt: string;
  aspect: string;
  style: Exclude<StyleId, 'auto'>;
}

/**
 * Build a multi-section plan from a free-text brief (or an uploaded .md body).
 * The first non-empty line becomes the hero; the rest become cards. One style
 * is resolved for the whole page (from `style`, or auto-derived from the brief)
 * and threaded into every item so the page reads as a single, cohesive film.
 */
export function planFromBrief(brief: string, style: StyleId = 'auto'): PlanItem[] {
  const lines = brief
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*+#>\d.\s]+/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const seed = brief.trim();
  const preset = resolveStyle(style, seed);

  const [first, ...rest] = lines;
  const plan: PlanItem[] = [
    {
      section: 'hero',
      title: titleCase(first),
      prompt: composePrompt({ brief: first, section: 'hero', style: preset.id, seed }),
      aspect: '16:9',
      style: preset.id,
    },
  ];
  rest.slice(0, 6).forEach((line, i) => {
    plan.push({
      section: 'card',
      title: titleCase(line),
      prompt: composePrompt({ brief: line, section: 'card', style: preset.id, index: i + 1, seed }),
      aspect: '1:1',
      style: preset.id,
    });
  });
  return plan;
}

function titleCase(s: string): string {
  const t = s.trim().slice(0, 48);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
