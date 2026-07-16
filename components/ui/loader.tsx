import { cn } from '@/lib/utils';

/**
 * The single, unified loader for the whole app. Cinematic feel: a dual gradient
 * ring spinning around a pulsing brand dot. Use it everywhere (loading.tsx,
 * Suspense fallbacks, inline busy states) for a consistent look.
 */

const SIZES = {
  sm: { box: 'h-6 w-6', ring: 'border-2', dot: 'h-1.5 w-1.5' },
  md: { box: 'h-10 w-10', ring: 'border-2', dot: 'h-2.5 w-2.5' },
  lg: { box: 'h-16 w-16', ring: 'border-[3px]', dot: 'h-3.5 w-3.5' },
  xl: { box: 'h-24 w-24', ring: 'border-4', dot: 'h-5 w-5' },
} as const;

export type LoaderSize = keyof typeof SIZES;

export function Loader({
  size = 'md',
  message,
  className,
}: {
  size?: LoaderSize;
  message?: string;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className={cn('relative', s.box)} role="status" aria-label={message || 'Loading'}>
        {/* track */}
        <div className={cn('absolute inset-0 rounded-full border-muted/40', s.ring)} />
        {/* spinning arc */}
        <div
          className={cn(
            'absolute inset-0 animate-spin rounded-full border-transparent border-t-primary border-r-primary/70',
            s.ring,
          )}
        />
        {/* pulsing core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('animate-pulse rounded-full bg-primary', s.dot)} />
        </div>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

/** Full-viewport centered loader (used by route-level loading.tsx). */
export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Loader size="xl" message={message} />
    </div>
  );
}
