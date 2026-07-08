import { LazyVideo } from '@/components/media/lazy-video';
import { Tilt } from '@/components/fx/tilt';
import type { MediaEntry } from '@/lib/media';

const IMAGE_SRC = /\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i;

/** A single media tile (product-card style) — video by default, image when the URL looks like one. */
export function VideoCard({ entry }: { entry: MediaEntry }) {
  return (
    <Tilt>
      <figure className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-xl">
        {IMAGE_SRC.test(entry.src) ? (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: (entry.aspectRatio ?? '16:9').replace(':', ' / ') }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.src}
              alt={entry.title}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover${entry.srcDark ? ' dark:hidden' : ''}`}
            />
            {entry.srcDark && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.srcDark}
                alt={entry.title}
                loading="lazy"
                className="absolute inset-0 hidden h-full w-full object-cover dark:block"
              />
            )}
          </div>
        ) : (
          <LazyVideo src={entry.src} srcMp4={entry.srcMp4} poster={entry.poster} ratio={entry.aspectRatio} className="w-full" />
        )}
        <figcaption className="p-4">
          <p className="truncate font-semibold">{entry.title}</p>
          {entry.subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.subtitle}</p>
          ) : entry.prompt ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.prompt}</p>
          ) : null}
        </figcaption>
      </figure>
    </Tilt>
  );
}

/** Responsive grid of video cards. */
export function VideoCardGrid({ entries }: { entries: MediaEntry[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((e) => (
        <VideoCard key={e.id} entry={e} />
      ))}
    </div>
  );
}
