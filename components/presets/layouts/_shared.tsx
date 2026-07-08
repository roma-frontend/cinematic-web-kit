import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Zap, Shield, Gauge, Coffee, Leaf, Heart,
  Dumbbell, Flame, Trophy, PenTool, Layers, Sparkles, Gem, Wine, Music, Ticket,
  Users, CalendarClock, MapPin, type LucideIcon,
} from 'lucide-react';
import type { PresetDef } from '@/lib/presets';
import { presetArtUrl } from '@/lib/presets';
import type { PresetContent, PresetCommon } from '@/lib/preset-demo-dict';

export interface LayoutProps {
  def: PresetDef;
  c: PresetContent;
  common: PresetCommon;
  label: string;
}

export const DISPLAY = { fontFamily: 'var(--font-display)' } as const;

export const ICONS: Record<string, LucideIcon> = {
  zap: Zap, shield: Shield, gauge: Gauge, coffee: Coffee, leaf: Leaf, heart: Heart,
  dumbbell: Dumbbell, flame: Flame, trophy: Trophy, 'pen-tool': PenTool, layers: Layers,
  sparkles: Sparkles, gem: Gem, wine: Wine, music: Music, ticket: Ticket,
  users: Users, 'calendar-clock': CalendarClock, 'map-pin': MapPin,
};

/** Themed image; falls back to a gradient block if the asset name is missing. */
export function Art({
  name, alt, className, imgClassName, grad, eager,
}: {
  name?: string; alt: string; className?: string; imgClassName?: string; grad?: string; eager?: boolean;
}) {
  if (!name) return <div className={`${grad ?? ''} ${className ?? ''}`} />;
  return (
    <span className={`block overflow-hidden ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={presetArtUrl(name)}
        alt={alt}
        className={`h-full w-full object-cover ${imgClassName ?? ''}`}
        loading={eager ? 'eager' : 'lazy'}
      />
    </span>
  );
}

export function PrimaryBtn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      href="/register"
      className={`group inline-flex items-center gap-2 rounded-[var(--radius)] bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 ${className ?? ''}`}
    >
      {children} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function GhostBtn({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <Link
      href="/presets"
      className={`inline-flex items-center gap-2 rounded-[var(--radius)] border px-6 py-3 font-semibold transition-colors ${
        dark ? 'border-white/30 bg-white/10 text-white backdrop-blur hover:border-white/60' : 'border-border bg-card/60 hover:border-primary/40'
      } ${className ?? ''}`}
    >
      {children}
    </Link>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 text-primary" /> {children}
    </span>
  );
}

/** Top demo bar (back · label · preview) — used by centered layouts. */
export function DemoBar({ label, common }: { label: string; common: PresetCommon }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/presets" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {common.backToPresets}
        </Link>
        <span className="hidden text-sm font-semibold sm:block" style={DISPLAY}>{label}</span>
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{common.previewBadge}</span>
      </div>
    </header>
  );
}

/** In-card brand + nav row — used by bento layouts. */
export function BrandNav({ label, nav }: { label: string; nav?: string[] }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-xl font-black tracking-tight" style={DISPLAY}>{label}</span>
      {nav && (
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {nav.map((n) => (
            <span key={n} className="cursor-default transition-colors hover:text-foreground">{n}</span>
          ))}
        </nav>
      )}
    </div>
  );
}

export function Footer({ label, common, tone = 'default' }: { label: string; common: PresetCommon; tone?: 'default' | 'plain' }) {
  return (
    <footer className={tone === 'plain' ? 'mt-4' : 'border-t border-border/60 bg-card/40'}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <span style={DISPLAY} className="font-bold text-foreground">{label}</span>
        <span>{common.footerNote}</span>
        <Link href="/presets" className="transition-colors hover:text-foreground">{common.allPresets}</Link>
      </div>
    </footer>
  );
}
