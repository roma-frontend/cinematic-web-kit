/** One media clip, as written by the pipeline into data/media.json. */
export interface MediaEntry {
  id: string;
  title: string;
  section: 'hero' | 'background' | 'card';
  prompt?: string;
  /** Cinematic style preset id used to generate this clip. */
  style?: string;
  /** Negative prompt passed to the model. */
  negativePrompt?: string;
  /** Clip retains an audio track (pipeline --audio) — enables the sound toggle. */
  sound?: boolean;
  src: string;
  /** Optional MP4 (H.264) fallback for browsers without VP9/WebM. */
  srcMp4?: string;
  poster?: string;
  aspectRatio?: string;
  createdAt?: string;
  /** Optional CTA for hero/background sections. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Optional subtitle/eyebrow text. */
  subtitle?: string;
}

/** Pad a list to at least `n` items by cycling, giving each a unique id. */
export function padEntries(entries: MediaEntry[], n: number): MediaEntry[] {
  if (entries.length === 0) return [];
  const out: MediaEntry[] = [];
  for (let i = 0; i < n; i++) {
    const base = entries[i % entries.length];
    out.push({ ...base, id: `${base.id}-${i}` });
  }
  return out;
}
