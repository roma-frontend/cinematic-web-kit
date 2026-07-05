import { LazyVideo } from '@/components/media/lazy-video';
import type { MediaEntry } from '@/lib/media';

/** A single video tile (product-card style). */
export function VideoCard({ entry }: { entry: MediaEntry }) {
  return (
    <figure className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg">
      <LazyVideo src={entry.src} srcMp4={entry.srcMp4} poster={entry.poster} ratio={entry.aspectRatio} className="w-full" />
      <figcaption className="p-4">
        <p className="truncate font-semibold">{entry.title}</p>
        {entry.prompt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.prompt}</p>}
      </figcaption>
    </figure>
  );
}

/** Responsive grid of video cards. */
export function VideoCardGrid({ entries }: { entries: MediaEntry[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((e) => (
        <VideoCard key={e.id} entry={e} />
      ))}
    </div>
  );
}
