import { getDna, type CinematicDna } from '@/lib/cinematic-dna';
import { composePrompt, type Section, type DnaInput } from '@/lib/prompt-composer';

export interface FilmScene {
  id: string;
  type: 'hero' | 'feature' | 'emotion' | 'cta';
  title: string;
  prompt: string;
  duration: number;
  aspect: string;
  dna?: DnaInput;
}

export function generateBrandFilmScript(
  brief: string,
  dnaId?: string,
  totalDuration: number = 30
): FilmScene[] {
  const dna = dnaId ? getDna(dnaId) : undefined;
  const dnaInput: DnaInput | undefined = dna
    ? {
        lens: dna.lens,
        lighting: dna.lighting,
        colorGrade: dna.colorGrade,
        filmStock: dna.filmStock,
        mood: dna.mood,
        motion: dna.motion,
      }
    : undefined;

  const scenes: FilmScene[] = [];
  const sceneCount = 5;
  const sceneDuration = Math.floor(totalDuration / sceneCount);

  const briefLines = brief
    .split(/[.!?]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const heroBrief = briefLines[0] || brief;
  scenes.push({
    id: 'hero',
    type: 'hero',
    title: 'Opening Shot',
    prompt: composePrompt({
      brief: heroBrief,
      section: 'hero',
      dna: dnaInput,
    }),
    duration: sceneDuration,
    aspect: '16:9',
    dna: dnaInput,
  });

  const featureBriefs = briefLines.slice(1, 4);
  const featureTitles = ['Key Feature', 'Unique Value', 'Core Benefit'];
  featureBriefs.forEach((featureBrief, i) => {
    scenes.push({
      id: `feature-${i + 1}`,
      type: 'feature',
      title: featureTitles[i] || `Feature ${i + 1}`,
      prompt: composePrompt({
        brief: featureBrief,
        section: 'card',
        dna: dnaInput,
        index: i,
      }),
      duration: sceneDuration,
      aspect: '16:9',
      dna: dnaInput,
    });
  });

  while (scenes.length < sceneCount - 1) {
    const idx = scenes.length - 1;
    scenes.push({
      id: `feature-${idx + 1}`,
      type: 'feature',
      title: `Feature ${idx + 1}`,
      prompt: composePrompt({
        brief: `${brief} - detail ${idx + 1}`,
        section: 'card',
        dna: dnaInput,
        index: idx,
      }),
      duration: sceneDuration,
      aspect: '16:9',
      dna: dnaInput,
    });
  }

  scenes.push({
    id: 'cta',
    type: 'cta',
    title: 'Call to Action',
    prompt: composePrompt({
      brief: `${brief} - brand logo and tagline reveal`,
      section: 'hero',
      dna: dnaInput,
    }),
    duration: sceneDuration,
    aspect: '16:9',
    dna: dnaInput,
  });

  return scenes;
}
