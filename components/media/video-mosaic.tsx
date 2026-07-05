import { LazyVideo } from '@/components/media/lazy-video';
import type { MediaEntry } from '@/lib/media';

/**
 * Editorial mosaic: a CSS-columns masonry of clips where the first tile spans
 * wider for a magazine-style rhythm. Feed it any number of entries.
 */
export function VideoMosaic({ entries }: { entries: MediaEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-6 py-8 sm:px-10">
      <div className="grid auto-rows-[14rem] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry, i) => {
          // Give every 5th tile (and the first) a 2×2 feature footprint.
          const feature = i === 0 || i % 5 === 0;
          return (
            <figure
              key={entry.id}
              className={`group relative overflow-hidden rounded-2xl border shadow-sm ${
                feature ? 'col-span-2 row-span-2' : ''
              }`}
            >
              <LazyVideo
                src={entry.src}
                srcMp4={entry.srcMp4}
                poster={entry.poster}
                ratio={feature ? '1:1' : entry.aspectRatio}
                className="h-full w-full"
              />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="truncate text-sm font-semibold text-white">{entry.title}</p>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
