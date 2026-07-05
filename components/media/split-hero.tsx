import { LazyVideo } from '@/components/media/lazy-video';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { MediaEntry } from '@/lib/media';

/**
 * Split hero: a looping clip on one side, headline / subtitle / CTA on the
 * other. Set `reverse` to put the video on the right. Great for feature intros.
 */
export function SplitHero({ entry, reverse = false }: { entry: MediaEntry; reverse?: boolean }) {
  return (
    <section className="mx-auto grid max-w-[var(--container-max)] items-center gap-8 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:gap-12">
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className="overflow-hidden rounded-3xl border shadow-lg">
          <LazyVideo src={entry.src} srcMp4={entry.srcMp4} poster={entry.poster} ratio={entry.aspectRatio} sound={entry.sound} className="w-full" />
        </div>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        {entry.subtitle && (
          <p className="mb-3 inline-flex rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {entry.subtitle}
          </p>
        )}
        <h2 className="text-balance text-3xl font-black tracking-tight sm:text-5xl">{entry.title}</h2>
        {entry.prompt && <p className="mt-4 max-w-prose text-muted-foreground">{entry.prompt}</p>}
        {entry.ctaHref && (
          <div className="mt-6">
            <Link href={entry.ctaHref}>
              <Button size="lg" className="gap-2">
                {entry.ctaLabel || 'Подробнее'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
