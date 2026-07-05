import { LazyVideo } from '@/components/media/lazy-video';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { MediaEntry } from '@/lib/media';

/**
 * Full-bleed cinematic hero: a looping background video with a dark gradient
 * scrim and headline + optional CTA. Drop it at the top of a landing page.
 */
export function VideoHero({ entry }: { entry: MediaEntry }) {
  return (
    <section className="relative isolate overflow-hidden">
      <LazyVideo src={entry.src} srcMp4={entry.srcMp4} poster={entry.poster} ratio={entry.aspectRatio} sound={entry.sound} className="max-h-[78vh] w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-[var(--container-max)] px-6 pb-14 sm:px-10">
          {entry.subtitle && (
            <p className="mb-3 inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
              {entry.subtitle}
            </p>
          )}
          <h1
            className="max-w-3xl text-balance text-4xl font-black tracking-tight text-white sm:text-6xl"
            style={{ textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}
          >
            {entry.title}
          </h1>
          {entry.ctaHref && (
            <div className="mt-6">
              <Link href={entry.ctaHref}>
                <Button size="lg" className="gap-2">
                  {entry.ctaLabel || 'Learn more'} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
