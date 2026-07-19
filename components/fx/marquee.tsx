import type { ReactNode } from 'react';

/**
 * Infinite horizontal marquee (pure CSS). Duplicates its items so the loop is
 * seamless. Pauses on hover. Use for feature strips / logo rows / taglines.
 */
export function Marquee({
  items,
  className,
  reverse = false,
  disabled = false,
}: {
  items: ReactNode[];
  className?: string;
  reverse?: boolean;
  /** Disable animation entirely (e.g., prefers-reduced-motion) */
  disabled?: boolean;
}) {
  const row = (key: string) => (
    <div className="marquee-row flex shrink-0 items-center gap-10 pr-10" aria-hidden={key === 'b'} key={key}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          {it}
          <span className="text-primary">•</span>
        </span>
      ))}
    </div>
  );
  // Pause animation when the tab is hidden by switching CSS var speed to 0.
  // Keep it pure-CSS so we don't add JS listeners in many instances.
  // Custom CSS variables aren't in React's CSSProperties type, so we cast via a
  // Record of custom properties instead of `any`.
  const style = {
    ...(reverse ? { '--marquee-dir': 'reverse' } : {}),
    ...(disabled ? { '--marquee-speed': '0s' } : {}),
  } as React.CSSProperties;
  return (
    <div className={`group relative flex overflow-hidden ${className ?? ''}`} style={style}>
      {row('a')}
      {row('b')}
      <style>
        {`
@keyframes marquee-x { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.group > .marquee-row { animation: marquee-x var(--marquee-speed, 28s) linear infinite; animation-direction: var(--marquee-dir, normal); }
.group:hover > .marquee-row { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .group > .marquee-row { animation: none; }
}
        `}
      </style>
    </div>
  );
}
