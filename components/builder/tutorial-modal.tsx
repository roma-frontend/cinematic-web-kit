'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GraduationCap, X, ArrowBigRight } from 'lucide-react';
import { mediaUrl } from '@/lib/media-url';

export interface TutorialLabels {
  watch: string;
  title: string;
  soon: string;
  soonHint: string;
  close: string;
}

export interface TutorialScene {
  /** Full-frame visual for this scene: an image (jpg/png) or a short clip (webm/mp4). */
  src: string;
  /** Placeholder label shown until the file is added / if it fails to load. */
  label: string;
  /** Optional blinking arrow pointing at the UI element the narrator describes.
   *  Positioned as % of the frame; `angle` rotates the arrow (0 = points right,
   *  90 = down, 180 = left, 270 = up). */
  arrow?: { xPct: number; yPct: number; angle?: number };
}

interface TutorialModalProps {
  /** Optional explicit video source (local file or YouTube/Vimeo URL). When
   *  omitted, the player auto-picks the per-language teacher video
   *  `/media/builder-tutorial.<locale>.webm`. */
  src?: string;
  /** Current UI locale — picks the localized teacher video + subtitles. */
  locale?: 'ru' | 'en' | 'hy';
  /** The 6 UI scenes shown full-frame, switched in sync with the narration
   *  (driven by the active subtitle cue → scene index). */
  scenes?: TutorialScene[];
  labels: TutorialLabels;
}

const isEmbed = (url: string) => /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vim = url.match(/vimeo\.com\/(\d+)/i);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return url;
}

const isClip = (src: string) => /\.(webm|mp4|mov|m4v)$/i.test(src);

export function TutorialModal({ src, locale = 'ru', scenes, labels }: TutorialModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [caption, setCaption] = useState('');
  const [badShots, setBadShots] = useState<Set<number>>(new Set());
  // Teacher video container: try .mp4 first, fall back to .webm (so either
  // encode the user provides just works), then show the placeholder.
  const [teacherExt, setTeacherExt] = useState<'mp4' | 'webm'>('mp4');
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const embed = !!src && isEmbed(src);
  // Teacher video + scenes come from R2/CDN when NEXT_PUBLIC_MEDIA_BASE_URL is
  // set (else local). Subtitles stay same-origin: cross-origin <track> cues are
  // not exposed to JS without CORS, and they drive the scene sync.
  const rawTeacher = src || `/media/builder-tutorial.${locale}.${teacherExt}`;
  const teacherSrc = embed ? src! : mediaUrl(rawTeacher);
  const subUrl = `/media/builder-tutorial.${locale}.vtt`;
  const onTeacherError = () => {
    if (!src && teacherExt === 'mp4') setTeacherExt('webm');
    else setFailed(true);
  };

  useEffect(() => { setMounted(true); }, []);

  // Gently pull attention to the tutorial: a first pulse ~30s after arriving,
  // then every 5 minutes (~6s each). Paused while the tutorial is open.
  useEffect(() => {
    if (open) { setPulse(false); return; }
    const fire = () => { setPulse(true); setTimeout(() => setPulse(false), 6000); };
    const first = setTimeout(fire, 30 * 1000);
    const id = setInterval(fire, 5 * 60 * 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [open]);

  // Six default scenes (placeholders) — the editor passes localized labels.
  const SCENES: TutorialScene[] = useMemo(
    () =>
      scenes ??
      Array.from({ length: 6 }, (_, i) => ({ src: `/media/tutorial-shot-${i + 1}.jpg`, label: `${i + 1}` })),
    [scenes],
  );

  // Esc to close, focus trap-ish, scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  // Sync scenes + captions to the narration via the video's subtitle track:
  // each subtitle cue maps 1:1 to a scene by its index. This keeps the visuals
  // aligned with the voice-over in any language, regardless of exact timing.
  useEffect(() => {
    if (!open || embed) return;
    const v = videoRef.current;
    if (!v) return;
    let track: TextTrack | null = null;
    const onCue = () => {
      if (!track) return;
      const active = track.activeCues;
      if (active && active.length) {
        const cue = active[0] as VTTCue;
        setCaption((cue.text || '').replace(/<[^>]+>/g, ''));
        const all = track.cues;
        if (all) {
          let idx = 0;
          for (let i = 0; i < all.length; i++) if (all[i] === cue) { idx = i; break; }
          setSceneIdx(Math.min(idx, SCENES.length - 1));
        }
      } else {
        setCaption('');
      }
    };
    const setup = () => {
      track = v.textTracks[0] ?? null;
      if (!track) return;
      track.mode = 'hidden';
      track.addEventListener('cuechange', onCue);
    };
    if (v.textTracks.length) setup();
    else v.addEventListener('loadedmetadata', setup, { once: true });
    return () => { track?.removeEventListener('cuechange', onCue); };
  }, [open, embed, teacherSrc, SCENES.length]);

  const scene = SCENES[Math.min(sceneIdx, SCENES.length - 1)];
  const showPlaceholderShot = !scene || badShots.has(sceneIdx);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${pulse ? 'tut-attn border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
        title={labels.watch}
      >
        <GraduationCap className="h-4 w-4 text-primary" />
        <span className="hidden xl:inline">{labels.watch}</span>
      </button>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes tut-attn{0%,100%{box-shadow:0 0 0 0 color-mix(in oklch,var(--primary) 55%,transparent);transform:scale(1)}50%{box-shadow:0 0 0 7px color-mix(in oklch,var(--primary) 0%,transparent);transform:scale(1.06)}}.tut-attn{animation:tut-attn 1.4s ease-out infinite}' }} />

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{labels.title}</span>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={labels.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {embed ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={toEmbedUrl(src!)}
                  title={labels.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : failed ? (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-black px-6 text-center">
                <GraduationCap className="h-8 w-8 text-primary/70" />
                <p className="text-sm font-semibold text-foreground">{labels.soon}</p>
                <p className="max-w-sm text-xs text-muted-foreground">{labels.soonHint}</p>
              </div>
            ) : (
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {/* Full-frame UI scenes — all mounted, cross-faded on change so
                    there is no black gap while a new asset loads. */}
                {SCENES.map((sc, i) => {
                  const active = i === sceneIdx;
                  const bad = badShots.has(i);
                  return (
                    <div key={sc.src + i} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${active ? 'opacity-100' : 'opacity-0'}`}>
                      {bad ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/40 to-background text-center">
                          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{i + 1} / {SCENES.length}</span>
                          <span className="max-w-md px-6 text-sm text-muted-foreground">{sc.label}</span>
                        </div>
                      ) : isClip(sc.src) ? (
                        <video src={mediaUrl(sc.src)} autoPlay muted loop playsInline className="h-full w-full object-cover" onError={() => setBadShots((s) => new Set(s).add(i))} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(sc.src)} alt={sc.label} className="h-full w-full object-cover" onError={() => setBadShots((s) => new Set(s).add(i))} />
                      )}
                    </div>
                  );
                })}

                {/* Blinking arrow pointing at the UI the narrator is describing */}
                {!showPlaceholderShot && scene?.arrow && (
                  <div
                    className="pointer-events-none absolute z-[9]"
                    style={{ left: `${scene.arrow.xPct}%`, top: `${scene.arrow.yPct}%`, transform: `translate(-50%,-50%) rotate(${scene.arrow.angle ?? 0}deg)` }}
                  >
                    <ArrowBigRight className="tut-arrow h-12 w-12 fill-primary text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,.75)]" />
                  </div>
                )}
                <style dangerouslySetInnerHTML={{ __html: '@keyframes tut-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.2;transform:scale(.72)}}.tut-arrow{animation:tut-blink 1s ease-in-out infinite}' }} />

                {/* Teacher video — bottom-right corner; drives the timeline + audio. */}
                <video
                  ref={videoRef}
                  key={teacherSrc}
                  src={teacherSrc}
                  autoPlay
                  playsInline
                  controls
                  className="absolute bottom-3 right-3 z-20 h-[40%] w-auto max-w-[42%] rounded-lg border border-white/20 bg-black shadow-2xl"
                  onError={onTeacherError}
                >
                  <track kind="subtitles" src={subUrl} srcLang={locale} label={locale} default />
                </video>

                {/* Scene progress dots */}
                <div className="absolute left-3 top-3 z-10 flex gap-1">
                  {SCENES.map((_, i) => (
                    <span key={i} className={`h-1.5 w-4 rounded-full transition-colors ${i === sceneIdx ? 'bg-primary' : 'bg-white/30'}`} />
                  ))}
                </div>

                {/* Caption / subtitle — bottom-left, clear of the corner video */}
                {caption && (
                  <div className="absolute bottom-0 left-0 right-[44%] z-[15] px-4 pb-3 pt-10">
                    <p className="rounded-md bg-black/55 px-3 py-1.5 text-sm font-medium text-white drop-shadow">{caption}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
