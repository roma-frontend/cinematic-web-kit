import { LazyVideo } from '@/components/media/lazy-video';
import type { MediaEntry } from '@/lib/media';

/** Full-width background band with a centered headline over a looping clip. */
export function VideoSection({ entry }: { entry: MediaEntry }) {
  return (
    <section className="relative isolate overflow-hidden">
      <LazyVideo src={entry.src} srcMp4={entry.srcMp4} poster={entry.poster} ratio={entry.aspectRatio} sound={entry.sound} className="max-h-[56vh] w-full" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/45">
        <div className="px-6 text-center">
          {entry.subtitle && (
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/80">{entry.subtitle}</p>
          )}
          <h2
            className="text-balance text-3xl font-bold text-white sm:text-5xl"
            style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}
          >
            {entry.title}
          </h2>
        </div>
      </div>
    </section>
  );
}
