import Link from 'next/link';
import { cloneElement, isValidElement, type ReactElement, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { BuilderForm } from './builder-form';
import { Accordion, Tabs } from './interactive';
import { Reveal, Stagger, ParallaxBg } from './reveal';
import { BgVideo } from './bg-video';
import { CountUp } from './count-up';
import { WebglGradient } from '@/components/landing/webgl-gradient';
import { LandingHero } from '@/components/landing/landing-hero';
import type { BuilderNode } from '@/lib/builder/types';
import { isContainer } from '@/lib/builder/types';
import { THEMES } from '@/lib/themes';
import { VideoCardGrid } from '@/components/media/video-card';
import mediaData from '@/data/media.json';
import type { MediaEntry } from '@/lib/media';
import { presetHrefFromSources } from '@/lib/media';
import { SiteAuthForm, SiteAccount } from '@/components/builder/site-auth-blocks';
import { CourseListBlock, DocumentListBlock, MaterialListBlock, MemberPlansBlock, PricingCta } from '@/components/builder/site-content-blocks';
import { siteRt, type SiteRtDict } from '@/lib/site-runtime-dict';

const RT_DEFAULT = siteRt('ru');


const okl = (v: string) => `oklch(${v})`;

// Parses "Title::Body" (one per line) into [title, body] pairs.
const parsePairs = (s: string | undefined): [string, string][] =>
  (s ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf('::');
      return idx === -1 ? [l, ''] : [l.slice(0, idx).trim(), l.slice(idx + 2).trim()];
    });

const lines = (s: string | undefined): string[] =>
  (s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

// Per-breakpoint image display modes. An image can render differently on
// mobile / tablet / desktop (e.g. full-bleed 'background' on mobile, 'cover'
// on desktop). Tablet inherits mobile; desktop inherits tablet when unset.
const BP_SHOW = { mobile: 'md:hidden', tablet: 'max-md:hidden lg:hidden', desktop: 'max-lg:hidden' } as const;
type BP = keyof typeof BP_SHOW;
function imgModes(p: Record<string, string>): Record<BP, string> {
  const base = p.imgMode || 'inline';
  const tablet = p.imgModeTablet && p.imgModeTablet !== '—' ? p.imgModeTablet : base;
  const desktop = p.imgModeDesktop && p.imgModeDesktop !== '—' ? p.imgModeDesktop : tablet;
  return { mobile: base, tablet, desktop };
}
function bgBreakpoints(p: Record<string, string>): Set<BP> {
  const m = imgModes(p);
  const s = new Set<BP>();
  (['mobile', 'tablet', 'desktop'] as BP[]).forEach((b) => { if (m[b] === 'background') s.add(b); });
  return s;
}
const BP_RANGE: Record<BP, string> = { mobile: '(max-width:767px)', tablet: '(min-width:768px) and (max-width:1023px)', desktop: '(min-width:1024px)' };
/** Tailwind classes to show an element only on the given breakpoints. */
function showOnly(bps: Set<BP>): string {
  const hide: string[] = [];
  if (!bps.has('mobile')) hide.push('max-md:hidden');
  if (!bps.has('tablet')) hide.push('md:max-lg:hidden');
  if (!bps.has('desktop')) hide.push('lg:hidden');
  return hide.join(' ');
}
/** First descendant image that uses 'background' on any breakpoint (not pruned). */
function findBgImage(nodes: BuilderNode[]): BuilderNode | null {
  for (const n of nodes) {
    if (n.type === 'image' && n.props?.src && bgBreakpoints(n.props).size > 0) return n;
    if (n.children) { const f = findBgImage(n.children); if (f) return f; }
  }
  return null;
}
/** Effective imgBg mode per breakpoint (mobile base → tablet → desktop). */
function imgBgModes(p: Record<string, string>): Record<BP, string> {
  const base = p.imgBg && p.imgBg !== '—' ? p.imgBg : 'off';
  const tablet = p.imgBgTablet && p.imgBgTablet !== '—' ? p.imgBgTablet : base;
  const desktop = p.imgBgDesktop && p.imgBgDesktop !== '—' ? p.imgBgDesktop : tablet;
  return { mobile: base, tablet, desktop };
}
/** First column (stack) flagged as an image-background surface, together with
 *  its first image child — hoisted to become the whole section's backdrop.
 *  Supports per-breakpoint on/off + mode. */
function findImgBgStack(nodes: BuilderNode[]): { src: string; mode: string; alt: string; bps: Set<BP> } | null {
  for (const n of nodes) {
    if (n.type === 'stack' && n.children) {
      const modes = imgBgModes(n.props ?? {});
      const bps = new Set<BP>((['mobile', 'tablet', 'desktop'] as BP[]).filter((b) => modes[b] !== 'off'));
      if (bps.size > 0) {
        const img = n.children.find((c) => c.type === 'image' && c.props?.src);
        if (img) {
          const mode = modes.desktop !== 'off' ? modes.desktop : modes.tablet !== 'off' ? modes.tablet : modes.mobile;
          return { src: img.props!.src, mode, alt: img.props?.alt || '', bps };
        }
      }
    }
    if (n.children) { const f = findImgBgStack(n.children); if (f) return f; }
  }
  return null;
}

// Recursively renders a BuilderNode tree into responsive Tailwind markup.
// Server component — the only client island is <BuilderForm>.

const PAD = { none: 'py-0', sm: 'py-8', md: 'py-14', lg: 'py-24' } as const;
const PAD_BOX = { none: 'p-0', sm: 'p-4', md: 'p-6', lg: 'p-8' } as const;
const BG = {
  none: '',
  muted: 'bg-muted/40',
  card: 'bg-card',
  primary: 'bg-primary text-primary-foreground',
} as const;
const WIDTH = { narrow: 'max-w-2xl', normal: 'max-w-4xl', wide: 'max-w-6xl' } as const;
const GAP = { none: 'gap-0', sm: 'gap-3', md: 'gap-6', lg: 'gap-10' } as const;
const ALIGN = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' } as const;
const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around', evenly: 'justify-evenly' } as const;
const JUSTIFY_ITEMS = { start: 'justify-items-start', center: 'justify-items-center', end: 'justify-items-end', stretch: 'justify-items-stretch' } as const;
// Child-level (item) layout inside a flex/grid parent.
const SELF_ALIGN: Record<string, string> = { auto: 'self-auto', start: 'self-start', center: 'self-center', end: 'self-end', stretch: 'self-stretch' };
const JUSTIFY_SELF: Record<string, string> = { auto: 'justify-self-auto', start: 'justify-self-start', center: 'justify-self-center', end: 'justify-self-end', stretch: 'justify-self-stretch' };
const GROW: Record<string, string> = { none: 'flex-none', grow: 'flex-1', shrink: 'shrink' };
const WIDTHS: Record<string, string> = { auto: 'w-auto', full: 'w-full', fit: 'w-fit' };
function layoutClass(p: Record<string, string>): string {
  return cn(
    respClass(SELF_ALIGN, p, 'alignSelf'),
    respClass(JUSTIFY_SELF, p, 'justifySelf'),
    respClass(GROW, p, 'grow'),
    respClass(WIDTHS, p, 'width'),
  );
}
// Turn a section's content area into a flex/grid layout directly (no need to
// nest a Row/Column/Grid container). `layout` = flex-row | flex-col | grid.
function SECTION_LAYOUT(p: Record<string, string>): string {
  const gap = respPick(GAP, p, 'gap', 'md');
  if (p.layout === 'grid') return cn('grid', gridColsClass(p, '2'), gap, respClass(ALIGN, p, 'align'), respClass(JUSTIFY_ITEMS, p, 'justifyItems'));
  // In a horizontal layout, make direct children share the row equally by
  // default (min-w-0 lets them shrink) so columns sit side by side instead of an
  // image forcing 100% width and wrapping. A child can still override via its
  // own "Растяжение" (grow) control.
  if (p.layout === 'flex-row') return cn('flex flex-wrap [&>*]:min-w-0', p.colWidth !== 'auto' && '[&>*]:flex-1', gap, respPick(ALIGN, p, 'align', 'stretch'), respClass(JUSTIFY, p, 'justify'));
  if (p.layout === 'flex-col') return cn('flex flex-col', gap, respPick(ALIGN, p, 'align', 'stretch'), respClass(JUSTIFY, p, 'justify'));
  return '';
}
const COLS = { '1': 'grid-cols-1', '2': 'grid-cols-1 sm:grid-cols-2', '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' } as const;
const TEXT_ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
const HEADING_SIZE = { '1': 'text-4xl sm:text-6xl', '2': 'text-3xl sm:text-4xl', '3': 'text-xl sm:text-2xl', '4': 'text-lg sm:text-xl' } as const;
const TEXT_SIZE = { sm: 'text-sm', base: 'text-base', lg: 'text-lg sm:text-xl' } as const;
const SPACE = { sm: 'h-6', md: 'h-12', lg: 'h-20' } as const;

// ---- styling system shared by all nodes ----
// motionClass: entrance animation, hover motion, vertical spacing (root)
const HOVER_FX: Record<string, string> = {
  none: '',
  lift: 'transition-transform duration-300 hover:-translate-y-1',
  grow: 'transition-transform duration-300 hover:scale-[1.03]',
  glow: 'transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/25',
  bright: 'transition-opacity duration-300 hover:opacity-80',
  pulse: 'hover-pulse',
};
const ANIM_FX: Record<string, string> = { none: '', fade: 'b-anim-fade', 'slide-up': 'b-anim-slide', zoom: 'b-anim-zoom' };
const MT: Record<string, string> = { none: '', sm: 'mt-3', md: 'mt-6', lg: 'mt-12' };
const MB: Record<string, string> = { none: '', sm: 'mb-3', md: 'mb-6', lg: 'mb-12' };
const LOOP: Record<string, string> = { none: '', pulse: 'b-loop-pulse', float: 'b-loop-float', bounce: 'b-loop-bounce' };
// Responsive visibility — uses only `hidden` utilities so the element's natural
// display type is preserved when shown (safe for flex/grid/inline elements).
const SHOW_ON: Record<string, string> = {
  all: '',
  mobile: 'md:hidden',
  tablet: 'max-md:hidden lg:hidden',
  desktop: 'max-lg:hidden',
};

function motionClass(p: Record<string, string>): string {
  // animation now handled by <Reveal> (Framer Motion, scroll-triggered)
  void ANIM_FX;
  return cn(respClass(HOVER_FX, p, 'hover'), respClass(LOOP, p, 'loop'), respClass(MT, p, 'mt'), respClass(MB, p, 'mb'));
}

// surfaceClass: shadow, focus ring, hover background/text (need :hover/:focus)
const SHADOW: Record<string, string> = { none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg', xl: 'shadow-2xl' };
const HOVER_BG: Record<string, string> = {
  none: '',
  primary: 'transition-colors hover:bg-primary hover:text-primary-foreground',
  muted: 'transition-colors hover:bg-muted',
  foreground: 'transition-colors hover:bg-foreground hover:text-background',
  dark: 'transition-colors hover:bg-black/80 hover:text-white',
};
const HOVER_TEXT: Record<string, string> = {
  none: '',
  primary: 'transition-colors hover:text-primary',
  foreground: 'transition-colors hover:text-foreground',
  muted: 'transition-colors hover:text-muted-foreground',
};
const RING: Record<string, string> = {
  none: '',
  primary: 'transition-shadow focus-within:ring-2 focus-within:ring-primary/60',
  subtle: 'transition-shadow focus-within:ring-2 focus-within:ring-border',
  offset: 'transition-shadow focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-background',
};

function surfaceClass(p: Record<string, string>): string {
  return cn(respClass(SHADOW, p, 'shadow'), respClass(RING, p, 'ring'), respClass(HOVER_BG, p, 'hoverBg'), respClass(HOVER_TEXT, p, 'hoverText'), p.shimmer === 'true' && 'b-shimmer');
}

// surfaceStyle: inline styles (always win over classes, update live)
const COLOR_VAR: Record<string, string> = { primary: 'var(--primary)', foreground: 'var(--foreground)', muted: 'var(--muted-foreground)', white: '#ffffff' };
const WEIGHT_VAL: Record<string, number> = { normal: 400, medium: 500, semibold: 600, bold: 700 };
const SIZE_VAL: Record<string, string> = { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem' };
const LETTER: Record<string, string> = { normal: 'normal', wide: '0.03em', wider: '0.06em' };
const LEADING: Record<string, string> = { tight: '1.2', normal: '1.5', relaxed: '1.75', loose: '2' };
const OPACITY: Record<string, number> = { '100': 1, '90': 0.9, '75': 0.75, '50': 0.5 };
const BG_VAR: Record<string, string> = { transparent: 'transparent', primary: 'var(--primary)', muted: 'var(--muted)', card: 'var(--card)', foreground: 'var(--foreground)', white: '#ffffff', black: '#000000' };
const BORDER_W: Record<string, string> = { '0': '0', '1': '1px', '2': '2px', '4': '4px' };
const BORDER_COLOR_VAR: Record<string, string> = { border: 'var(--border)', primary: 'var(--primary)', muted: 'var(--muted-foreground)', foreground: 'var(--foreground)', white: '#ffffff' };
const RADIUS_VAL: Record<string, string> = { none: '0', sm: '0.375rem', lg: '0.75rem', xl: '1.5rem', full: '9999px' };

function surfaceStyle(p: Record<string, string>): CSSProperties {
  const s: CSSProperties = {};
  if (p.textColor) s.color = p.textColor.startsWith('#') ? p.textColor : COLOR_VAR[p.textColor];
  if (p.fontWeight && WEIGHT_VAL[p.fontWeight]) s.fontWeight = WEIGHT_VAL[p.fontWeight];
  if (p.fontSize) s.fontSize = SIZE_VAL[p.fontSize] ?? p.fontSize; // accept custom "20px"/"1.2rem"
  if (p.letterSpacing && LETTER[p.letterSpacing]) s.letterSpacing = LETTER[p.letterSpacing];
  if (p.lineHeight && LEADING[p.lineHeight]) s.lineHeight = LEADING[p.lineHeight];
  if (p.opacity && OPACITY[p.opacity] != null) s.opacity = OPACITY[p.opacity];
  if (p.bgColor) s.background = p.bgColor.startsWith('#') ? p.bgColor : BG_VAR[p.bgColor];
  if (p.borderWidth && p.borderWidth !== '0' && BORDER_W[p.borderWidth]) {
    s.borderStyle = 'solid';
    s.borderWidth = BORDER_W[p.borderWidth];
    const bc = p.borderColor || 'border';
    s.borderColor = bc.startsWith('#') ? bc : BORDER_COLOR_VAR[bc] || 'var(--border)';
  }
  if (p.radius && RADIUS_VAL[p.radius] != null) s.borderRadius = RADIUS_VAL[p.radius];
  advStyle(p, s);
  return s;
}

// ---- Advanced raw-value CSS props (namespaced css*) --------------------------
// Every key below takes a RAW CSS value (e.g. "24px", "10px 20px", "rotate(6deg)
// scale(1.05)", "blur(4px)") so a user can express essentially any CSS. They are
// namespaced with `css`/typographic prefixes to never collide with the existing
// scale-based class props (padding/gap/width/height/…). Because they live in
// SURFACE_KEYS, each one is automatically per-breakpoint (base/Tablet/Desktop)
// through bpProps + the scoped <style> emitter.
const TRANSFORM_ORIGIN: Record<string, string> = {
  center: 'center', top: 'top', bottom: 'bottom', left: 'left', right: 'right',
  'top-left': 'top left', 'top-right': 'top right', 'bottom-left': 'bottom left', 'bottom-right': 'bottom right',
};
function advStyle(p: Record<string, string>, s: CSSProperties): void {
  const v = (k: string) => { const x = p[k]; return x && x !== '—' ? x : undefined; };
  // Sizing
  if (v('cssWidth')) s.width = v('cssWidth');
  if (v('cssHeight')) s.height = v('cssHeight');
  if (v('cssMaxW')) s.maxWidth = v('cssMaxW');
  if (v('cssMinW')) s.minWidth = v('cssMinW');
  if (v('cssMaxH')) s.maxHeight = v('cssMaxH');
  if (v('cssMinH')) s.minHeight = v('cssMinH');
  if (v('cssAspect')) s.aspectRatio = v('cssAspect');
  // Spacing (raw, per-side allowed via shorthand)
  if (v('cssPadding')) s.padding = v('cssPadding');
  if (v('cssMargin')) s.margin = v('cssMargin');
  if (v('cssGap')) s.gap = v('cssGap');
  // Box / effects
  if (v('cssShadow')) s.boxShadow = v('cssShadow');
  if (v('cssGradient')) s.backgroundImage = v('cssGradient');
  if (v('cssBgImage')) s.backgroundImage = `url(${v('cssBgImage')})`;
  if (v('cssBgSize')) s.backgroundSize = v('cssBgSize');
  if (v('cssBgPosition')) s.backgroundPosition = v('cssBgPosition');
  if (v('cssTransform')) s.transform = v('cssTransform');
  if (v('cssTransformOrigin')) s.transformOrigin = TRANSFORM_ORIGIN[v('cssTransformOrigin')!] ?? v('cssTransformOrigin');
  if (v('cssFilter')) s.filter = v('cssFilter');
  if (v('cssBackdrop')) { s.backdropFilter = v('cssBackdrop'); (s as Record<string, string>).WebkitBackdropFilter = v('cssBackdrop')!; }
  if (v('cssMixBlend')) s.mixBlendMode = v('cssMixBlend') as CSSProperties['mixBlendMode'];
  if (v('cssTransition')) s.transition = v('cssTransition');
  // Typography extras
  if (v('cssTextAlign')) s.textAlign = v('cssTextAlign') as CSSProperties['textAlign'];
  if (v('cssTextTransform')) s.textTransform = v('cssTextTransform') as CSSProperties['textTransform'];
  if (v('cssTextDecoration')) s.textDecoration = v('cssTextDecoration');
  if (v('cssFontStyle')) s.fontStyle = v('cssFontStyle');
  if (v('cssFontFamily')) s.fontFamily = v('cssFontFamily');
  if (v('cssTextShadow')) s.textShadow = v('cssTextShadow');
  if (v('cssWhiteSpace')) s.whiteSpace = v('cssWhiteSpace') as CSSProperties['whiteSpace'];
  // Box behavior / positioning
  if (v('cssCursor')) s.cursor = v('cssCursor');
  if (v('cssOverflow')) s.overflow = v('cssOverflow') as CSSProperties['overflow'];
  if (v('cssZ')) s.zIndex = Number(v('cssZ')) || v('cssZ') as unknown as number;
  if (v('cssPosition')) s.position = v('cssPosition') as CSSProperties['position'];
  if (v('cssTop')) s.top = v('cssTop');
  if (v('cssLeft')) s.left = v('cssLeft');
  if (v('cssRight')) s.right = v('cssRight');
  if (v('cssBottom')) s.bottom = v('cssBottom');
}
// Keys carrying advanced raw-value styles (kept separate so surfaceStyle stays
// readable, but they ARE added to SURFACE_KEYS below for per-breakpoint output).
const ADV_KEYS = [
  'cssWidth', 'cssHeight', 'cssMaxW', 'cssMinW', 'cssMaxH', 'cssMinH', 'cssAspect',
  'cssPadding', 'cssMargin', 'cssGap',
  'cssShadow', 'cssGradient', 'cssBgImage', 'cssBgSize', 'cssBgPosition',
  'cssTransform', 'cssTransformOrigin', 'cssFilter', 'cssBackdrop', 'cssMixBlend', 'cssTransition',
  'cssTextAlign', 'cssTextTransform', 'cssTextDecoration', 'cssFontStyle', 'cssFontFamily', 'cssTextShadow', 'cssWhiteSpace',
  'cssCursor', 'cssOverflow', 'cssZ', 'cssPosition', 'cssTop', 'cssLeft', 'cssRight', 'cssBottom',
] as const;

const pick = <T extends Record<string, string>>(map: T, key: string | undefined, fallback: keyof T): string =>
  map[(key ?? '') as keyof T] ?? map[fallback];

// ---- Per-breakpoint (responsive) surface styles ----
// Base props = mobile (apply everywhere); keys suffixed `Tablet` (>=768px) and
// `Desktop` (>=1024px) override for larger screens, inheriting mobile → tablet →
// desktop when unset. Because these are inline-style properties (which cannot
// carry @media rules), we emit a scoped <style> targeting [data-nid] instead.
const SURFACE_KEYS = ['textColor', 'fontWeight', 'fontSize', 'letterSpacing', 'lineHeight', 'opacity', 'bgColor', 'borderWidth', 'borderColor', 'radius', ...ADV_KEYS] as const;
function bpProps(p: Record<string, string>, bp: 'base' | 'tablet' | 'desktop'): Record<string, string> {
  const out: Record<string, string> = {};
  const ov = (k: string, s: string) => { const v = p[k + s]; return v && v !== '—' ? v : undefined; };
  for (const k of SURFACE_KEYS) {
    let v: string | undefined = p[k];
    if (bp !== 'base') { const t = ov(k, 'Tablet'); if (t !== undefined) v = t; }
    if (bp === 'desktop') { const d = ov(k, 'Desktop'); if (d !== undefined) v = d; }
    if (v !== undefined && v !== '') out[k] = v;
  }
  // carry through border color companion + borderWidth handling done in surfaceStyle
  if (p.borderColor && !out.borderColor) out.borderColor = p.borderColor;
  return out;
}
function hasResponsive(p: Record<string, string>): boolean {
  return SURFACE_KEYS.some((k) => (p[k + 'Tablet'] && p[k + 'Tablet'] !== '—') || (p[k + 'Desktop'] && p[k + 'Desktop'] !== '—'));
}
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const declOf = (st: CSSProperties): string =>
  Object.entries(st).map(([k, v]) => `${kebab(k)}:${v}`).join(';');
function responsiveCss(id: string, p: Record<string, string>, innerSel = false): string {
  const sel = innerSel ? `[data-nid="${id}"] :where(button,input,textarea,a)` : `[data-nid="${id}"]`;
  const base = declOf(surfaceStyle(bpProps(p, 'base')));
  const tab = declOf(surfaceStyle(bpProps(p, 'tablet')));
  const desk = declOf(surfaceStyle(bpProps(p, 'desktop')));
  return `${sel}{${base}}@media(min-width:768px){${sel}{${tab}}}@media(min-width:1024px){${sel}{${desk}}}`;
}
// Class-based (Tailwind) props also become per-breakpoint: base applies to all,
// `<key>Tablet` gets an `md:` prefix, `<key>Desktop` an `lg:` prefix.
const prefixCls = (cls: string, prefix: string): string =>
  cls ? cls.split(/\s+/).filter(Boolean).map((t) => prefix + t).join(' ') : '';
function respClass(map: Record<string, string>, p: Record<string, string>, key: string): string {
  const g = (k: string) => { const v = p[k]; return v && v !== '—' && map[v] ? map[v] : ''; };
  return cn(g(key), prefixCls(g(key + 'Tablet'), 'md:'), prefixCls(g(key + 'Desktop'), 'lg:'));
}
// Like respClass but the base always resolves (uses `fallback` when unset), for
// container props that need a default (gap, align in flex rows/columns).
function respPick(map: Record<string, string>, p: Record<string, string>, key: string, fallback: string): string {
  const g = (k: string) => { const v = p[k]; return v && v !== '—' && map[v] ? map[v] : ''; };
  return cn(pick(map, p[key], fallback), prefixCls(g(key + 'Tablet'), 'md:'), prefixCls(g(key + 'Desktop'), 'lg:'));
}
// Per-breakpoint container layout (gap / align-items / justify-content /
// justify-items) is emitted as raw CSS @media instead of Tailwind md:/lg:
// prefixes, because those dynamic prefixes are purged from the build.
const GAP_CSS: Record<string, string> = { none: '0', sm: '0.75rem', md: '1.5rem', lg: '2.5rem' };
const ALIGN_CSS: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
const JUSTIFY_CSS: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around', evenly: 'space-evenly' };
const JITEMS_CSS: Record<string, string> = { start: 'start', center: 'center', end: 'end', stretch: 'stretch' };
// A container's text color cascades to every text descendant (heading, text,
// list, link…) — overriding muted/theme defaults — while a child that sets its
// own color still wins (its inline style beats this stylesheet rule).
function containerTextCss(id: string, p: Record<string, string>): string {
  const c = (bp: 'base' | 'tablet' | 'desktop') => {
    const v = bpProps(p, bp).textColor;
    return v ? (v.startsWith('#') ? v : (COLOR_VAR[v] ?? '')) : '';
  };
  const b = c('base'), t = c('tablet'), d = c('desktop');
  if (!b && !t && !d) return '';
  const sel = `[data-nid="${id}"] :where(h1,h2,h3,h4,h5,h6,p,span,li,blockquote,a,strong,em)`;
  let css = '';
  if (b) css += `${sel}{color:${b}}`;
  if (t && t !== b) css += `@media(min-width:768px){${sel}{color:${t}}}`;
  if (d && d !== (t || b)) css += `@media(min-width:1024px){${sel}{color:${d}}}`;
  return css;
}
function hasResponsiveLayout(p: Record<string, string>): boolean {
  return ['gap', 'align', 'justify', 'justifyItems'].some((k) => (p[k + 'Tablet'] && p[k + 'Tablet'] !== '—') || (p[k + 'Desktop'] && p[k + 'Desktop'] !== '—'));
}
function layoutMedia(sel: string, p: Record<string, string>): string {
  const decl = (suf: string) => {
    const g = (k: string) => { const v = p[k + suf]; return v && v !== '—' ? v : ''; };
    const parts: string[] = [];
    if (GAP_CSS[g('gap')] != null && g('gap')) parts.push(`gap:${GAP_CSS[g('gap')]}`);
    if (ALIGN_CSS[g('align')]) parts.push(`align-items:${ALIGN_CSS[g('align')]}`);
    if (JUSTIFY_CSS[g('justify')]) parts.push(`justify-content:${JUSTIFY_CSS[g('justify')]}`);
    if (JITEMS_CSS[g('justifyItems')]) parts.push(`justify-items:${JITEMS_CSS[g('justifyItems')]}`);
    return parts.join(';');
  };
  const t = decl('Tablet'), d = decl('Desktop');
  return (t ? `@media(min-width:768px){${sel}{${t}}}` : '') + (d ? `@media(min-width:1024px){${sel}{${d}}}` : '');
}
// Per-breakpoint change of the SECTION content layout MODE (block/flex/grid) —
// emitted as raw CSS because it toggles display/flex-direction/grid together.
function sectionModeMedia(id: string, p: Record<string, string>): string {
  const sel = `[data-nid="${id}"] [data-layout]`;
  const colsN = (suf: string) => {
    const v = (p['columns' + suf] && p['columns' + suf] !== '—' ? p['columns' + suf] : '') || (suf === 'Desktop' && p.columnsTablet && p.columnsTablet !== '—' ? p.columnsTablet : '') || p.columns || '2';
    return ['1', '2', '3', '4'].includes(v) ? v : '2';
  };
  const modeCss = (lay: string, suf: string) =>
    lay === 'grid' ? `display:grid;grid-template-columns:repeat(${colsN(suf)},minmax(0,1fr))`
    : lay === 'flex-row' ? 'display:flex;flex-direction:row;flex-wrap:wrap'
    : lay === 'flex-col' ? 'display:flex;flex-direction:column'
    : lay === 'block' ? 'display:block'
    : '';
  const childCss = (lay: string) =>
    lay === 'flex-row' ? `${sel}>*{min-width:0}${p.colWidth !== 'auto' ? `${sel}>*{flex:1 1 0%}` : ''}` : '';
  const one = (suf: string, minw: number) => {
    const lay = p['layout' + suf] && p['layout' + suf] !== '—' ? p['layout' + suf] : '';
    if (!lay) return '';
    return `@media(min-width:${minw}px){${sel}{${modeCss(lay, suf)}}${childCss(lay)}}`;
  };
  return one('Tablet', 768) + one('Desktop', 1024);
}
// When the user sets per-device column counts we switch to flat cols + md:/lg:.
const FLAT_COLS: Record<string, string> = { '1': 'grid-cols-1', '2': 'grid-cols-2', '3': 'grid-cols-3', '4': 'grid-cols-4' };
function gridColsClass(p: Record<string, string>, fallback: string): string {
  const t = p.columnsTablet && p.columnsTablet !== '—' ? p.columnsTablet : '';
  const d = p.columnsDesktop && p.columnsDesktop !== '—' ? p.columnsDesktop : '';
  if (!t && !d) return pick(COLS, p.columns, fallback as keyof typeof COLS);
  return cn(
    FLAT_COLS[p.columns] ?? FLAT_COLS[fallback] ?? 'grid-cols-1',
    t && FLAT_COLS[t] ? 'md:' + FLAT_COLS[t] : '',
    d && FLAT_COLS[d] ? 'lg:' + FLAT_COLS[d] : '',
  );
}

// ---- Advanced scoped CSS: animations, hover-state, raw custom CSS -----------
// Built-in @keyframes library. Each is emitted (once per node that uses it) as
// `@keyframes kf-<name>` so the animation shorthand can reference it.
const KEYFRAMES: Record<string, string> = {
  fadein: '0%{opacity:0}100%{opacity:1}',
  fadeup: '0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:none}',
  fadedown: '0%{opacity:0;transform:translateY(-24px)}100%{opacity:1;transform:none}',
  fadeleft: '0%{opacity:0;transform:translateX(24px)}100%{opacity:1;transform:none}',
  faderight: '0%{opacity:0;transform:translateX(-24px)}100%{opacity:1;transform:none}',
  zoomin: '0%{opacity:0;transform:scale(.85)}100%{opacity:1;transform:scale(1)}',
  zoomout: '0%{opacity:0;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}',
  spin: '0%{transform:rotate(0)}100%{transform:rotate(360deg)}',
  pulse: '0%,100%{transform:scale(1)}50%{transform:scale(1.06)}',
  float: '0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}',
  bounce: '0%,100%{transform:translateY(0)}25%{transform:translateY(-14px)}50%{transform:translateY(0)}75%{transform:translateY(-6px)}',
  shake: '0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}',
  swing: '0%,100%{transform:rotate(0)}30%{transform:rotate(6deg)}60%{transform:rotate(-4deg)}',
  wobble: '0%,100%{transform:none}25%{transform:translateX(-6%) rotate(-3deg)}50%{transform:translateX(4%) rotate(2deg)}75%{transform:translateX(-2%) rotate(-1deg)}',
  heartbeat: '0%,100%{transform:scale(1)}14%{transform:scale(1.18)}28%{transform:scale(1)}42%{transform:scale(1.14)}70%{transform:scale(1)}',
  blink: '0%,100%{opacity:1}50%{opacity:.25}',
  glow: '0%,100%{filter:drop-shadow(0 0 0 var(--primary))}50%{filter:drop-shadow(0 0 12px var(--primary))}',
  jelly: '0%,100%{transform:scale(1,1)}30%{transform:scale(1.1,.9)}50%{transform:scale(.92,1.08)}70%{transform:scale(1.03,.97)}',
  'gradient-shift': '0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}',
};
const ANIM_TIMING: Record<string, string> = {
  ease: 'ease', linear: 'linear', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out',
  spring: 'cubic-bezier(.34,1.56,.64,1)', smooth: 'cubic-bezier(.4,0,.2,1)',
};
const HV_COLOR = (v: string) => (v.startsWith('#') ? v : COLOR_VAR[v] ?? BG_VAR[v] ?? BORDER_COLOR_VAR[v] ?? v);
// Emit `@keyframes` (built-in or custom) + the `animation:` shorthand for a node.
function animationCss(id: string, p: Record<string, string>): string {
  const name = p.animName && p.animName !== '—' && p.animName !== 'none' ? p.animName : '';
  if (!name) return '';
  const kfName = name === 'custom' ? `kf-${id}` : `kf-${name}`;
  const body = name === 'custom' ? (p.animKeyframes || '').trim() : KEYFRAMES[name];
  if (!body) return '';
  const dur = p.animDuration || '1s';
  const timing = ANIM_TIMING[p.animTiming || 'ease'] ?? (p.animTiming || 'ease');
  const delay = p.animDelay || '0s';
  const iter = p.animIter && p.animIter !== '—' ? p.animIter : '1';
  const dir = p.animDirection && p.animDirection !== '—' ? p.animDirection : 'normal';
  const fill = p.animFill && p.animFill !== '—' ? p.animFill : 'both';
  const kf = `@keyframes ${kfName}{${body}}`;
  const anim = `[data-nid="${id}"]{animation:${kfName} ${dur} ${timing} ${delay} ${iter} ${dir} ${fill}}`;
  return kf + anim;
}
// Hover-state scoped styles from hv* props (+ a default transition when none set).
function hoverCss(id: string, p: Record<string, string>): string {
  const v = (k: string) => { const x = p[k]; return x && x !== '—' ? x : undefined; };
  const decl: string[] = [];
  if (v('hvBg')) decl.push(`background:${HV_COLOR(v('hvBg')!)}`);
  if (v('hvText')) decl.push(`color:${HV_COLOR(v('hvText')!)}`);
  if (v('hvBorderColor')) decl.push(`border-color:${HV_COLOR(v('hvBorderColor')!)}`);
  if (v('hvShadow')) decl.push(`box-shadow:${v('hvShadow')}`);
  if (v('hvOpacity')) decl.push(`opacity:${v('hvOpacity')}`);
  if (v('hvRadius')) decl.push(`border-radius:${RADIUS_VAL[v('hvRadius')!] ?? v('hvRadius')}`);
  if (v('hvFilter')) decl.push(`filter:${v('hvFilter')}`);
  const tf: string[] = [];
  if (v('hvScale')) tf.push(`scale(${v('hvScale')})`);
  if (v('hvRotate')) tf.push(`rotate(${v('hvRotate')})`);
  if (v('hvTranslateY')) tf.push(`translateY(${v('hvTranslateY')})`);
  if (v('hvTransform')) tf.push(v('hvTransform')!);
  if (tf.length) decl.push(`transform:${tf.join(' ')}`);
  if (v('hvCss')) decl.push(v('hvCss')!.replace(/;\s*$/, ''));
  if (!decl.length) return '';
  const sel = `[data-nid="${id}"]`;
  // Default smooth transition on the base element unless the user set their own.
  const base = p.cssTransition ? '' : `${sel}{transition:all .3s ease}`;
  return `${base}${sel}:hover{${decl.join(';')}}`;
}
// Raw custom CSS. `customCss` = declarations applied to the node. `customCssFull`
// = a full stylesheet where `&` is replaced by this node's selector, enabling
// any selector, nested rule, @media or @keyframes the user wants.
function customCssBlock(id: string, p: Record<string, string>): string {
  const sel = `[data-nid="${id}"]`;
  let out = '';
  const decls = (p.customCss || '').trim();
  if (decls) out += `${sel}{${decls.replace(/;\s*$/, '')}}`;
  const full = (p.customCssFull || '').trim();
  if (full) out += full.replace(/&/g, sel);
  return out;
}
function advancedCss(id: string, p: Record<string, string>): string {
  return animationCss(id, p) + hoverCss(id, p) + customCssBlock(id, p);
}

function Field({ node }: { node: BuilderNode }) {
  const p = node.props;
  const base = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const ctrlCls = cn(base, surfaceClass(p), node.type === 'textarea' && 'resize-y');
  const ctrlStyle = hasResponsive(p) ? undefined : surfaceStyle(p);
  const required = p.required === 'true';
  const control =
    node.type === 'textarea' ? (
      <textarea name={p.name || 'field'} placeholder={p.placeholder} rows={4} required={required} className={ctrlCls} style={ctrlStyle} />
    ) : (
      <input name={p.name || 'field'} type={p.type || 'text'} placeholder={p.placeholder} required={required} className={ctrlCls} style={ctrlStyle} />
    );
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm font-medium">
      {p.label ? <span>{p.label}{required ? <span className="text-red-500"> *</span> : null}</span> : null}
      {control}
    </label>
  );
}

// Elements that apply surface styling to their own inner control instead of
// the root wrapper (so borders/ring/hover land on the button/input itself).
const SELF_STYLED = new Set<string>(['button', 'input', 'textarea']);

export function RenderNode({ node, t = RT_DEFAULT }: { node: BuilderNode; t?: SiteRtDict }) {
  const el = renderInner(node, t);
  if (!isValidElement(el)) return el;
  const p = node.props ?? {};
  const elProps = el.props as { className?: string; style?: CSSProperties };
  const self = SELF_STYLED.has(node.type);
  const merged: { 'data-nid': string; 'data-node-type': string; 'data-prop'?: string; 'data-container'?: string; className: string; style?: CSSProperties } = {
    'data-nid': node.id,
    'data-node-type': node.type,
    className: cn(elProps.className, motionClass(p), layoutClass(p), self ? '' : surfaceClass(p), p.showOn && SHOW_ON[p.showOn]),
  };
  // Text nodes whose element directly holds props.text are editable inline
  // (double-click in the preview → contenteditable → commit as a patch).
  if (node.type === 'heading' || node.type === 'text') merged['data-prop'] = 'text';
  if (isContainer(node.type)) merged['data-container'] = '1';
  const responsive = hasResponsive(p);
  // Container flex/grid overrides (gap/align/justify/justify-items) as raw CSS.
  const layoutSel = node.type === 'section' ? `[data-nid="${node.id}"] [data-layout]` : `[data-nid="${node.id}"]`;
  const layoutCss = isContainer(node.type) && hasResponsiveLayout(p) ? layoutMedia(layoutSel, p) : '';
  const modeCss = node.type === 'section' && ((p.layoutTablet && p.layoutTablet !== '—') || (p.layoutDesktop && p.layoutDesktop !== '—')) ? sectionModeMedia(node.id, p) : '';
  if (!self) {
    if (responsive) {
      // Surface styling delivered via scoped <style> (below) so @media overrides
      // apply; keep only the element's intrinsic inline style here.
      if (elProps.style) merged.style = elProps.style;
    } else {
      const st = surfaceStyle(p);
      if (Object.keys(st).length) merged.style = { ...(elProps.style ?? {}), ...st };
    }
  }
  const cloned = cloneElement(el as ReactElement<typeof merged>, merged);
  const css = (responsive ? responsiveCss(node.id, p, self) : '') + layoutCss + modeCss + (isContainer(node.type) ? containerTextCss(node.id, p) : '') + advancedCss(node.id, p);
  const out = css ? (
    <>
      {cloned}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  ) : cloned;
  // When wrapped for scroll-animation, the wrapper becomes the flex/grid item —
  // carry the item-level layout classes onto it so align-self/grow/width still apply.
  if (p.animate && p.animate !== 'none') return <Reveal type={p.animate} className={layoutClass(p)}>{out}</Reveal>;
  return out;
}

function renderInner(node: BuilderNode, t: SiteRtDict) {
  const p = node.props ?? {};
  const kids = node.children ?? [];

  switch (node.type) {
    case 'section': {
      const gradient = p.bg === 'gradient';
      // A descendant image using 'background' (on any breakpoint) becomes the
      // section's full-bleed backdrop, shown only on those breakpoints. The
      // image node itself renders its non-background variants inline for the
      // other breakpoints (handled in the 'image' case), so it stays in flow.
      const bgNode = findBgImage(kids);
      // A column (stack) flagged "картинка как фон колонки" hoists its image to
      // fill the whole section (absolute inset-0), using its mode as the bg mode.
      const bgStack = !bgNode && !p.bgImage && !p.bgVideo ? findImgBgStack(kids) : null;
      const bgImageSrc = p.bgImage || bgNode?.props?.src || bgStack?.src;
      const bgChildOverlay = bgNode?.props?.overlay;
      const bgVis = bgNode && !p.bgImage ? showOnly(bgBreakpoints(bgNode.props)) : bgStack ? showOnly(bgStack.bps) : '';
      const sectionKids = kids;
      const hasMedia = !!(bgImageSrc || p.bgVideo);
      // Media covering ALL breakpoints (uniform) vs a per-breakpoint column bg.
      const uniformMedia = !!(p.bgVideo || p.bgImage || bgNode);
      const gradStyle = gradient
        ? { backgroundImage: 'linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 45%, #000))', color: 'var(--primary-foreground)' }
        : undefined;
      // Background display modes for an image/video behind the section content.
      const bgMode = bgStack?.mode || p.bgMode || 'cover';
      const mediaFilter =
        bgMode === 'blur' ? 'blur(14px) saturate(1.15) brightness(0.9)'
        : bgMode === 'glass' ? 'blur(8px) saturate(1.1) brightness(0.95)'
        : bgMode === 'duotone' ? 'grayscale(1) contrast(1.05)'
        : undefined;
      const mediaClass = cn('absolute inset-0 h-full w-full object-cover', (bgMode === 'blur' || bgMode === 'glass') && 'scale-110', bgVis);
      const overlayBg: Record<string, string> = {
        cover: 'rgba(0,0,0,0.5)',
        blur: 'rgba(0,0,0,0.45)',
        glass: 'rgba(10,10,16,0.32)',
        overlay: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 100%)',
        tint: 'linear-gradient(135deg, color-mix(in oklch, var(--primary) 65%, transparent), color-mix(in oklch, var(--primary) 30%, #000))',
        duotone: 'color-mix(in oklch, var(--primary) 45%, transparent)',
      };
      const MINH: Record<string, string> = { none: '', half: 'min-h-[60vh]', screen: 'min-h-dvh' };
      const tall = p.minH === 'half' || p.minH === 'screen';
      // Per-breakpoint styling for a column-hoisted background: white legible text
      // (and the frosted glass panel for glass mode) only on the active screens.
      const bgStackCss = bgStack ? [...bgStack.bps].map((b) => {
        let d = 'color:#fff;text-shadow:0 1px 14px rgba(0,0,0,.45)';
        if (bgMode === 'glass') d += ';background:color-mix(in oklch, white 12%, transparent);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border:1px solid rgba(255,255,255,.18);border-radius:1.25rem;padding-top:2rem;padding-bottom:2rem;box-shadow:0 8px 40px rgba(0,0,0,.25)';
        return `@media ${BP_RANGE[b]}{[data-nid="${node.id}"] [data-layout]{${d}}}`;
      }).join('') : '';
      return (
        <section className={cn('relative overflow-hidden', tall && 'flex flex-col justify-center', pick(PAD, p.padding, 'lg'), pick(MINH, p.minH, 'none'), gradient ? '' : pick(BG, p.bg, 'none'))} style={gradStyle}>
          {p.bgVideo ? (
            <BgVideo className={mediaClass} style={mediaFilter ? { filter: mediaFilter } : undefined} src={p.bgVideo} />
          ) : bgImageSrc ? (
            p.parallax === 'true' ? (
              <ParallaxBg src={bgImageSrc} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={mediaClass} style={mediaFilter ? { filter: mediaFilter } : undefined} src={bgImageSrc} alt="" />
            )
          ) : null}
          {hasMedia && <div className={cn('absolute inset-0', bgVis)} style={{ background: bgChildOverlay || (overlayBg[bgMode] ?? overlayBg.cover) }} />}
          {p.fx === 'webgl' ? (
            <>
              {/* Animated WebGL gradient — the hero's signature effect. Falls
                  back to the CSS aurora behind it if WebGL is unavailable. */}
              <div className="b-aurora" aria-hidden />
              <WebglGradient className="absolute inset-0 h-full w-full opacity-60" />
            </>
          ) : p.fx === 'aurora' ? <div className="b-aurora" aria-hidden /> : p.fx === 'grid' ? <div className="b-pattern-grid" aria-hidden /> : p.fx === 'dots' ? <div className="b-pattern-dots" aria-hidden /> : null}
          <div data-layout className={cn('relative z-10 mx-auto w-full px-6', pick(WIDTH, p.width, 'wide'), uniformMedia && 'text-white', uniformMedia && 'b-legible', uniformMedia && bgMode === 'glass' && 'b-glass-panel', SECTION_LAYOUT(p))}>
            {sectionKids.map((c) => (
              <RenderNode key={c.id} node={c} t={t} />
            ))}
          </div>
          {bgStack && bgStackCss && (
            <style dangerouslySetInnerHTML={{ __html: bgStackCss }} />
          )}
        </section>
      );
    }

    case 'stack': {
      const stackCls = cn('flex flex-col', respPick(GAP, p, 'gap', 'md'), respPick(ALIGN, p, 'align', 'stretch'), respClass(JUSTIFY, p, 'justify'));
      // When this column is used as an image background, its image is hoisted to
      // the parent section (absolute inset-0, behind content). Here we render only
      // the remaining children (texts) in normal flow, so they sit on top clearly.
      const bgM = imgBgModes(p);
      const stackBgActive = bgM.mobile !== 'off' || bgM.tablet !== 'off' || bgM.desktop !== 'off';
      // The first image is the hoisted section backdrop on the breakpoints where
      // bg is ON. On the OFF breakpoints keep it inline so it doesn't disappear —
      // hide it only where the backdrop takes over.
      const ALLB: BP[] = ['mobile', 'tablet', 'desktop'];
      const hideInline = showOnly(new Set<BP>(ALLB.filter((b) => bgM[b] === 'off')));
      const firstImg = stackBgActive ? kids.findIndex((c) => c.type === 'image' && c.props?.src) : -1;
      const kidsEls = kids.map((c, i) =>
        i === firstImg
          ? <div key={c.id} className={hideInline}><RenderNode node={c} t={t} /></div>
          : <RenderNode key={c.id} node={c} t={t} />,
      );
      if (p.stagger === 'true') return <Stagger className={stackCls}>{kidsEls}</Stagger>;
      return <div className={stackCls}>{kidsEls}</div>;
    }

    case 'row':
      return (
        <div
          className={cn(
            'flex',
            p.wrap === 'nowrap' ? 'flex-nowrap' : 'flex-wrap',
            respPick(GAP, p, 'gap', 'md'),
            respPick(ALIGN, p, 'align', 'center'),
            respPick(JUSTIFY, p, 'justify', 'start'),
          )}
        >
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} t={t} />
          ))}
        </div>
      );

    case 'grid': {
      const gridCls = cn('grid', gridColsClass(p, '3'), respPick(GAP, p, 'gap', 'md'), respClass(ALIGN, p, 'align'), respClass(JUSTIFY_ITEMS, p, 'justifyItems'));
      const kidsEls = kids.map((c) => <RenderNode key={c.id} node={c} t={t} />);
      if (p.stagger === 'true') return <Stagger className={gridCls}>{kidsEls}</Stagger>;
      return <div className={gridCls}>{kidsEls}</div>;
    }

    case 'card': {
      const cv = p.cardVariant || (p.border === 'false' ? 'plain' : 'elevated');
      const cardBase =
        cv === 'outline' ? 'border border-border'
        : cv === 'soft' ? 'bg-muted/50'
        : cv === 'glass' ? 'b-glass'
        : cv === 'plain' ? ''
        : 'bg-card border border-border shadow-md'; // elevated
      return (
        <div className={cn('flex flex-col rounded-2xl', pick(GAP, p.gap, 'sm'), pick(PAD_BOX, p.padding, 'md'), cardBase)}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} t={t} />
          ))}
        </div>
      );
    }

    case 'heading': {
      const Tag = (`h${p.level && ['1', '2', '3', '4'].includes(p.level) ? p.level : '2'}`) as 'h1' | 'h2' | 'h3' | 'h4';
      return (
        <Tag className={cn('font-display font-bold tracking-tight text-balance', pick(HEADING_SIZE, p.level, '2'), pick(TEXT_ALIGN, p.align, 'left'), p.gradient === 'true' && 'b-gradient-text')}>
          {p.text}
        </Tag>
      );
    }

    case 'text':
      return (
        <p className={cn('leading-relaxed', pick(TEXT_SIZE, p.size, 'base'), pick(TEXT_ALIGN, p.align, 'left'), p.gradient === 'true' ? 'b-gradient-text font-semibold' : p.muted === 'true' ? 'text-muted-foreground' : '')}>
          {p.text}
        </p>
      );

    case 'button': {
      type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
      const cls = cn(buttonVariants({ variant: (p.variant as Variant) || 'default', size: (p.size as 'default' | 'sm' | 'lg') || 'default' }), 'bn-btn', surfaceClass(p));
      const wrap = pick(TEXT_ALIGN, p.align, 'left');
      const st = hasResponsive(p) ? undefined : surfaceStyle(p);
      const inner =
        p.type === 'submit' || p.type === 'reset' ? (
          <button type={p.type} className={cls} style={st}>
            {p.text}
          </button>
        ) : (
          <Link href={p.href || '#'} className={cls} style={st}>
            {p.text}
          </Link>
        );
      return <div className={wrap}>{inner}</div>;
    }

    case 'image': {
      if (!p.src && !p.srcDark) {
        return (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {t.imagePlaceholder}
          </div>
        );
      }
      const src = p.src || p.srcDark || '';
      const srcDark = p.srcDark || '';
      const alt = p.alt || '';
      const roundedCls = p.rounded === 'full' ? 'rounded-full' : p.rounded === 'none' ? '' : 'rounded-xl';
      const ratioStyle = p.ratio ? { aspectRatio: p.ratio.replace('/', ' / ') } : undefined;

      // Render one inline variant for a given mode + image source. 'background'
      // returns null — it's drawn as the section backdrop (see the 'section'
      // case), so the image occupies no inline space on background breakpoints.
      const variant = (mode: string, imgSrc: string): React.ReactNode => {
        if (mode === 'background') return null;
        if (mode === 'glow') {
          return (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-105 object-cover opacity-60 blur-2xl" style={ratioStyle} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt={alt} className={cn('relative w-full object-cover shadow-2xl', roundedCls)} style={ratioStyle} />
            </div>
          );
        }
        if (mode === 'overlay') {
          return (
            <div className={cn('relative w-full overflow-hidden', roundedCls)} style={ratioStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt={alt} className="h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1) 60%)' }} />
            </div>
          );
        }
        if (mode === 'duotone') {
          return (
            <div className={cn('relative w-full overflow-hidden', roundedCls)} style={ratioStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt={alt} className="h-full w-full object-cover" style={{ filter: 'grayscale(1) contrast(1.05)' }} />
              <div className="absolute inset-0 mix-blend-color" style={{ background: 'var(--primary)' }} />
            </div>
          );
        }
        if (mode === 'framed') {
          return (
            <div className="w-full rounded-2xl border border-border bg-card p-2 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt={alt} className={cn('w-full object-cover', roundedCls)} style={ratioStyle} />
            </div>
          );
        }
        // cover: tall banner; inline (default): natural flow.
        const coverStyle = mode === 'cover' ? { aspectRatio: (p.ratio || '16/6').replace('/', ' / ') } : ratioStyle;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={alt} className={cn('w-full object-cover', roundedCls, mode === 'cover' && 'shadow-lg')} style={coverStyle} />
        );
      };

      // Compose the (possibly per-breakpoint) inline output for one source.
      const renderFor = (imgSrc: string): React.ReactNode => {
        const modes = imgModes(p);
        const uniform = modes.mobile === modes.tablet && modes.tablet === modes.desktop;
        if (uniform) {
          // Single mode across breakpoints. 'background' → nothing inline.
          return (variant(modes.mobile, imgSrc) as ReactElement) ?? <span className="hidden" data-img-bg="1" />;
        }
        // Different modes per breakpoint: render each visible in its own range.
        return (
          <div className="contents">
            {(['mobile', 'tablet', 'desktop'] as BP[]).map((bp) => {
              const v = variant(modes[bp], imgSrc);
              return v ? <div key={bp} className={BP_SHOW[bp]}>{v}</div> : null;
            })}
          </div>
        );
      };

      // Per-theme sources: show the light image in light mode and the dark image
      // in dark mode, CSS-toggled (no JS, no flicker). Falls back to a single
      // image when only one source is set.
      if (srcDark && srcDark !== src) {
        return (
          <>
            <span className="contents dark:hidden">{renderFor(src)}</span>
            <span className="hidden dark:contents">{renderFor(srcDark)}</span>
          </>
        );
      }
      return renderFor(src);
    }

    case 'input':
    case 'textarea':
      return <Field node={node} />;

    case 'form':
      return (
        <BuilderForm formId={p.formId || 'form'} submitText={p.submitText || t.submit} successMsg={p.successMsg || t.thanks} webhook={p.webhook} notifyEmail={p.notifyEmail} redirect={p.redirect} honeypot={p.honeypot !== 'off'}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} t={t} />
          ))}
        </BuilderForm>
      );

    case 'counter':
      return (
        <div className={pick(TEXT_ALIGN, p.align, 'center')}>
          <div className="font-display text-4xl font-black tracking-tight sm:text-5xl">
            <CountUp value={p.value || '0'} />
          </div>
          {p.label ? <div className="mt-1 text-sm text-muted-foreground">{p.label}</div> : null}
        </div>
      );

    case 'divider':
      return <hr className="my-6 border-border" />;

    case 'list': {
      const items = lines(p.items);
      const lv = p.listVariant || 'bullet';
      if (lv === 'numbered') {
        return (
          <ol className="list-decimal space-y-1.5 pl-5 text-base leading-relaxed">
            {items.map((it, i) => <li key={i}>{it}</li>)}
          </ol>
        );
      }
      const marker = lv === 'check' ? '✓' : lv === 'arrow' ? '→' : lv === 'plain' ? '' : '•';
      return (
        <ul className="space-y-1.5 text-base leading-relaxed">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              {marker && <span className={cn('shrink-0', lv === 'check' ? 'text-primary' : 'text-muted-foreground')}>{marker}</span>}
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    }

    case 'video': {
      const src = p.src || '';
      const style = p.ratio ? { aspectRatio: p.ratio.replace('/', ' / ') } : undefined;
      const rounded = p.rounded === 'none' ? '' : 'rounded-xl';
      const isEmbed = /youtube\.com|youtu\.be|vimeo\.com/.test(src);
      if (!src) {
        return <div className={cn('flex aspect-video w-full items-center justify-center border border-dashed border-border text-sm text-muted-foreground', rounded)}>{t.videoPlaceholder}</div>;
      }
      return isEmbed ? (
        <iframe src={src.replace('watch?v=', 'embed/')} title="video" className={cn('w-full border-0', rounded)} style={style} allowFullScreen />
      ) : (
        <video src={src} controls className={cn('w-full', rounded)} style={style} />
      );
    }

    case 'pricing': {
      const feats = lines(p.features);
      const featured = p.featured === 'true';
      const pv = p.priceVariant || 'card';
      const box =
        pv === 'outline' ? 'border-2 border-border'
        : pv === 'minimal' ? ''
        : featured ? 'border border-primary bg-primary/5 shadow-lg' : 'border border-border bg-card'; // card
      return (
        <div className={cn('flex flex-col gap-4 rounded-2xl p-6', box, featured && pv !== 'card' && 'ring-2 ring-primary')}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{p.plan}</p>
            <p className="mt-1 text-4xl font-black">{p.price}<span className="text-base font-normal text-muted-foreground">{p.period}</span></p>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {feats.map((f, i) => (
              <li key={i} className="flex items-start gap-2"><span className="text-primary">✓</span> {f}</li>
            ))}
          </ul>
          {p.cta ? (
            <PricingCta planId={p.planId} href={p.href} cta={p.cta} featured={featured} />
          ) : null}
        </div>
      );
    }

    case 'testimonial': {
      const tv = p.quoteVariant || 'card';
      if (tv === 'quote') {
        return (
          <figure className="relative pl-8">
            <span className="absolute left-0 top-0 font-serif text-5xl leading-none text-primary/40">“</span>
            <blockquote className="text-xl leading-relaxed">{p.quote}</blockquote>
            <figcaption className="mt-3 text-sm"><span className="font-semibold">{p.author}</span>{p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null}</figcaption>
          </figure>
        );
      }
      if (tv === 'minimal') {
        return (
          <figure className="flex flex-col gap-2">
            <blockquote className="leading-relaxed">“{p.quote}”</blockquote>
            <figcaption className="text-sm text-muted-foreground">{p.author}{p.role ? `, ${p.role}` : ''}</figcaption>
          </figure>
        );
      }
      if (tv === 'centered') {
        return (
          <figure className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <blockquote className="text-xl leading-relaxed">“{p.quote}”</blockquote>
            <figcaption className="text-sm"><span className="font-semibold">{p.author}</span>{p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null}</figcaption>
          </figure>
        );
      }
      return (
        <figure className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <blockquote className="text-lg leading-relaxed">“{p.quote}”</blockquote>
          <figcaption className="text-sm"><span className="font-semibold">{p.author}</span>{p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null}</figcaption>
        </figure>
      );
    }

    case 'socials': {
      const links = lines(p.links).map((l) => {
        const [label, href] = l.split('|');
        return { label: (label ?? '').trim(), href: (href ?? '#').trim() };
      });
      const sv = p.socialVariant || 'pills';
      const justify = pick(TEXT_ALIGN, p.align, 'left') === 'text-center' ? 'justify-center' : pick(TEXT_ALIGN, p.align, 'left') === 'text-right' ? 'justify-end' : 'justify-start';
      const cls =
        sv === 'buttons' ? cn(buttonVariants({ variant: 'outline', size: 'sm' }))
        : sv === 'pills' ? 'rounded-full border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground'
        : sv === 'underline' ? 'text-sm font-medium underline-offset-4 hover:underline'
        : 'text-sm font-medium text-muted-foreground hover:text-foreground'; // minimal
      return (
        <div className={cn('flex flex-wrap gap-2', justify)}>
          {links.map((l, i) => (
            <Link key={i} href={l.href} className={cls}>{l.label}</Link>
          ))}
        </div>
      );
    }

    case 'faq':
      return <Accordion items={parsePairs(p.items)} variant={p.faqVariant || 'bordered'} />;

    case 'tabs':
      return <Tabs items={parsePairs(p.items)} />;

    case 'spacer':
      return <div className={pick(SPACE, p.height, 'md')} aria-hidden />;

    case 'themeGallery': {
      const count = Math.max(1, Math.min(12, parseInt(p.count || '6', 10) || 6));
      const cols = p.columns === '2' ? 'grid-cols-1 sm:grid-cols-2' : p.columns === '4' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      return (
        <div className={cn('grid gap-4', cols)}>
          {THEMES.slice(0, count).map((th) => {
            const cls = `tgc-${th.id}`;
            const pv = (pal: Record<string, string>) => ([
              ['bg', pal.background], ['fg', pal.foreground], ['primary', pal.primary],
              ['card', pal.card], ['muted', pal.muted], ['mfg', pal['muted-foreground']], ['border', pal.border],
            ] as [string, string][]).map(([k, v]) => `--tp-${k}:${okl(v)}`).join(';');
            const css = `.${cls}{${pv(th.light)}}.dark .${cls}{${pv(th.dark)}}`;
            return (
              <Link
                key={th.id}
                href={`/themes/${th.id}`}
                className={`${cls} group overflow-hidden rounded-2xl border shadow-sm transition-transform hover:-translate-y-0.5`}
                style={{ background: 'var(--tp-bg)', color: 'var(--tp-fg)', borderColor: 'var(--tp-border)' }}
              >
                <style dangerouslySetInnerHTML={{ __html: css }} />
                <div className="p-5">
                  <span className="text-base font-bold tracking-tight">{th.label}</span>
                  <p className="mt-1 text-xs" style={{ color: 'var(--tp-mfg)' }}>{th.fontDisplay} · {t.motion} {th.motion}</p>
                  <div className="mt-4 flex gap-2">
                    {['var(--tp-primary)', 'var(--tp-card)', 'var(--tp-muted)', 'var(--tp-fg)', 'var(--tp-border)'].map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-md" style={{ background: c, border: '1px solid var(--tp-border)' }} />
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      );
    }

    case 'videoGrid': {
      // Manual media list: one "URL::Title::Caption::Poster" per line. Images
      // (by extension) and videos both work. When empty, the grid falls back
      // to the first `count` clips generated in the Studio (data/media.json).
      const parsedRows = lines(p.items)
        .map((ln) => {
          const [src = '', title = '', subtitle = '', poster = '', srcDark = '', posterDark = ''] = ln.split('::').map((s) => s.trim());
          return { src, title, subtitle, poster, srcDark, posterDark };
        })
        .filter((r) => r.src || r.srcDark);
      const count = Math.max(1, Math.min(12, parseInt(p.count || '6', 10) || 6));
      if (parsedRows.length === 0) {
        const fallback = (mediaData as MediaEntry[]).slice(0, count);
        return fallback.length ? <VideoCardGrid entries={fallback} /> : null;
      }
      // One entry per row, carrying its optional dark-theme variant. VideoCard
      // toggles the light/dark image or clip per card (CSS), so a single grid
      // handles both themes — no duplicated grid, no wrapper element.
      const entries: MediaEntry[] = parsedRows.map((r, i) => ({
        id: `${node.id}-item-${i}`,
        title: r.title,
        section: 'card',
        src: r.src || r.srcDark,
        subtitle: r.subtitle || undefined,
        poster: r.poster || undefined,
        srcDark: r.srcDark || undefined,
        posterDark: r.posterDark || undefined,
        aspectRatio: '16:9',
        href: presetHrefFromSources(r.src, r.srcDark, r.poster, r.posterDark),
      }));
      return <VideoCardGrid entries={entries} />;
    }

    case 'landingHero': {
      // Renders the REAL coded hero (WebGL bg, glass browser mock, animated
      // word-stagger headline, magnetic CTA) — so the landing edited/published
      // from the builder keeps all its effects. Editable text comes from props;
      // the theme swatches in the mock are derived from the installed themes.
      const swatches = THEMES.slice(0, 4).map((th) => ({
        id: th.id,
        label: th.label,
        colors: [`oklch(${th.light.primary})`, `oklch(${th.dark.primary})`, `oklch(${th.light.muted})`],
      }));
      const microItems = (p.microcopy || '').split('·').map((s) => s.trim()).filter(Boolean);
      return (
        <LandingHero
          badge={p.badge || ''}
          title={p.title || ''}
          subtitle={p.subtitle || ''}
          primary={{ label: p.ctaPrimaryLabel || '', href: p.ctaPrimaryHref || '/' }}
          secondary={{ label: p.ctaSecondaryLabel || '', href: p.ctaSecondaryHref || '/' }}
          microItems={microItems}
          previewLabels={{ url: p.previewUrl || 'ваш-сайт.ru', publish: p.previewPublish || 'Опубликовано' }}
          swatches={swatches}
        />
      );
    }

    case 'authLogin':
      return <SiteAuthForm mode="login" title={p.title} submitText={p.submitText} successMsg={p.successMsg} />;

    case 'authRegister':
      return <SiteAuthForm mode="register" title={p.title} submitText={p.submitText} successMsg={p.successMsg} showName={p.showName !== 'false'} />;

    case 'authAccount':
      return <SiteAccount title={p.title} logoutText={p.logoutText} />;

    case 'courseList':
      return <CourseListBlock title={p.title} columns={p.columns} showProgress={p.showProgress} />;

    case 'documentList':
      return <DocumentListBlock title={p.title} columns={p.columns} />;

    case 'materialList':
      return <MaterialListBlock title={p.title} columns={p.columns} />;
    case 'memberPlans':
      return <MemberPlansBlock title={p.title} columns={p.columns} ctaHref={p.ctaHref} />;

    default:
      return null;
  }
}
