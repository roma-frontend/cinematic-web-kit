import Link from 'next/link';
import { cloneElement, isValidElement, type ReactElement, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { BuilderForm } from './builder-form';
import { Accordion, Tabs } from './interactive';
import { Reveal, Stagger, ParallaxBg } from './reveal';
import { CountUp } from './count-up';
import type { BuilderNode } from '@/lib/builder/types';
import { isContainer } from '@/lib/builder/types';
import { THEMES } from '@/lib/themes';
import { VideoCardGrid } from '@/components/media/video-card';
import mediaData from '@/data/media.json';
import type { MediaEntry } from '@/lib/media';
import { SiteAuthForm, SiteAccount } from '@/components/builder/site-auth-blocks';

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
const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' } as const;
const COLS = { '1': 'sm:grid-cols-1', '2': 'sm:grid-cols-2', '3': 'sm:grid-cols-2 lg:grid-cols-3', '4': 'sm:grid-cols-2 lg:grid-cols-4' } as const;
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
  return cn(p.hover && HOVER_FX[p.hover], p.loop && LOOP[p.loop], p.mt && MT[p.mt], p.mb && MB[p.mb]);
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
  return cn(p.shadow && SHADOW[p.shadow], p.ring && RING[p.ring], p.hoverBg && HOVER_BG[p.hoverBg], p.hoverText && HOVER_TEXT[p.hoverText]);
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
  return s;
}

const pick = <T extends Record<string, string>>(map: T, key: string | undefined, fallback: keyof T): string =>
  map[(key ?? '') as keyof T] ?? map[fallback];

function Field({ node }: { node: BuilderNode }) {
  const p = node.props;
  const base = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const ctrlCls = cn(base, surfaceClass(p), node.type === 'textarea' && 'resize-y');
  const ctrlStyle = surfaceStyle(p);
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

export function RenderNode({ node }: { node: BuilderNode }) {
  const el = renderInner(node);
  if (!isValidElement(el)) return el;
  const p = node.props ?? {};
  const elProps = el.props as { className?: string; style?: CSSProperties };
  const self = SELF_STYLED.has(node.type);
  const merged: { 'data-nid': string; 'data-container'?: string; className: string; style?: CSSProperties } = {
    'data-nid': node.id,
    className: cn(elProps.className, motionClass(p), self ? '' : surfaceClass(p), p.showOn && SHOW_ON[p.showOn]),
  };
  if (isContainer(node.type)) merged['data-container'] = '1';
  if (!self) {
    const st = surfaceStyle(p);
    if (Object.keys(st).length) merged.style = { ...(elProps.style ?? {}), ...st };
  }
  const cloned = cloneElement(el as ReactElement<typeof merged>, merged);
  if (p.animate && p.animate !== 'none') return <Reveal type={p.animate}>{cloned}</Reveal>;
  return cloned;
}

function renderInner(node: BuilderNode) {
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
      const bgImageSrc = p.bgImage || bgNode?.props?.src;
      const bgChildOverlay = bgNode?.props?.overlay;
      const bgVis = bgNode && !p.bgImage ? showOnly(bgBreakpoints(bgNode.props)) : '';
      const sectionKids = kids;
      const hasMedia = !!(bgImageSrc || p.bgVideo);
      const gradStyle = gradient
        ? { backgroundImage: 'linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 45%, #000))', color: 'var(--primary-foreground)' }
        : undefined;
      // Background display modes for an image/video behind the section content.
      const bgMode = p.bgMode || 'cover';
      const mediaFilter =
        bgMode === 'blur' ? 'blur(14px) saturate(1.15) brightness(0.9)'
        : bgMode === 'duotone' ? 'grayscale(1) contrast(1.05)'
        : undefined;
      const mediaClass = cn('absolute inset-0 h-full w-full object-cover', bgMode === 'blur' && 'scale-110', bgVis);
      const overlayBg: Record<string, string> = {
        cover: 'rgba(0,0,0,0.5)',
        blur: 'rgba(0,0,0,0.45)',
        overlay: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.15) 100%)',
        tint: 'linear-gradient(135deg, color-mix(in oklch, var(--primary) 65%, transparent), color-mix(in oklch, var(--primary) 30%, #000))',
        duotone: 'color-mix(in oklch, var(--primary) 45%, transparent)',
      };
      const MINH: Record<string, string> = { none: '', half: 'min-h-[60vh]', screen: 'min-h-dvh' };
      const tall = p.minH === 'half' || p.minH === 'screen';
      return (
        <section className={cn('relative overflow-hidden', tall && 'flex flex-col justify-center', pick(PAD, p.padding, 'lg'), pick(MINH, p.minH, 'none'), gradient ? '' : pick(BG, p.bg, 'none'))} style={gradStyle}>
          {p.bgVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video className={mediaClass} style={mediaFilter ? { filter: mediaFilter } : undefined} src={p.bgVideo} autoPlay muted loop playsInline />
          ) : bgImageSrc ? (
            p.parallax === 'true' ? (
              <ParallaxBg src={bgImageSrc} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={mediaClass} style={mediaFilter ? { filter: mediaFilter } : undefined} src={bgImageSrc} alt="" />
            )
          ) : null}
          {hasMedia && <div className={cn('absolute inset-0', bgVis)} style={{ background: bgChildOverlay || (overlayBg[bgMode] ?? overlayBg.cover) }} />}
          <div className={cn('relative z-10 mx-auto w-full px-6', pick(WIDTH, p.width, 'wide'), hasMedia && 'text-white')}>
            {sectionKids.map((c) => (
              <RenderNode key={c.id} node={c} />
            ))}
          </div>
        </section>
      );
    }

    case 'stack': {
      const stackCls = cn('flex flex-col', pick(GAP, p.gap, 'md'), pick(ALIGN, p.align, 'stretch'));
      const kidsEls = kids.map((c) => <RenderNode key={c.id} node={c} />);
      if (p.stagger === 'true') return <Stagger className={stackCls}>{kidsEls}</Stagger>;
      return <div className={stackCls}>{kidsEls}</div>;
    }

    case 'row':
      return (
        <div
          className={cn(
            'flex',
            p.wrap === 'nowrap' ? 'flex-nowrap' : 'flex-wrap',
            pick(GAP, p.gap, 'md'),
            pick(ALIGN, p.align, 'center'),
            pick(JUSTIFY, p.justify, 'start'),
          )}
        >
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} />
          ))}
        </div>
      );

    case 'grid': {
      const gridCls = cn('grid grid-cols-1', pick(COLS, p.columns, '3'), pick(GAP, p.gap, 'md'));
      const kidsEls = kids.map((c) => <RenderNode key={c.id} node={c} />);
      if (p.stagger === 'true') return <Stagger className={gridCls}>{kidsEls}</Stagger>;
      return <div className={gridCls}>{kidsEls}</div>;
    }

    case 'card': {
      const cv = p.cardVariant || (p.border === 'false' ? 'plain' : 'elevated');
      const cardBase =
        cv === 'outline' ? 'border border-border'
        : cv === 'soft' ? 'bg-muted/50'
        : cv === 'plain' ? ''
        : 'bg-card border border-border shadow-md'; // elevated
      return (
        <div className={cn('flex flex-col rounded-2xl', pick(GAP, p.gap, 'sm'), pick(PAD_BOX, p.padding, 'md'), cardBase)}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} />
          ))}
        </div>
      );
    }

    case 'heading': {
      const Tag = (`h${p.level && ['1', '2', '3', '4'].includes(p.level) ? p.level : '2'}`) as 'h1' | 'h2' | 'h3' | 'h4';
      return (
        <Tag className={cn('font-display font-bold tracking-tight text-balance', pick(HEADING_SIZE, p.level, '2'), pick(TEXT_ALIGN, p.align, 'left'))}>
          {p.text}
        </Tag>
      );
    }

    case 'text':
      return (
        <p className={cn('leading-relaxed', pick(TEXT_SIZE, p.size, 'base'), pick(TEXT_ALIGN, p.align, 'left'), p.muted === 'true' ? 'text-muted-foreground' : '')}>
          {p.text}
        </p>
      );

    case 'button': {
      type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
      const cls = cn(buttonVariants({ variant: (p.variant as Variant) || 'default', size: (p.size as 'default' | 'sm' | 'lg') || 'default' }), surfaceClass(p));
      const wrap = pick(TEXT_ALIGN, p.align, 'left');
      const st = surfaceStyle(p);
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
      if (!p.src) {
        return (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Изображение
          </div>
        );
      }
      const src = p.src;
      const alt = p.alt || '';
      const roundedCls = p.rounded === 'full' ? 'rounded-full' : p.rounded === 'none' ? '' : 'rounded-xl';
      const ratioStyle = p.ratio ? { aspectRatio: p.ratio.replace('/', ' / ') } : undefined;

      // Render one inline variant for a given mode. 'background' returns null —
      // it's drawn as the section backdrop (see the 'section' case), so the
      // image occupies no inline space on background breakpoints.
      const variant = (mode: string): React.ReactNode => {
        if (mode === 'background') return null;
        if (mode === 'glow') {
          return (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-105 object-cover opacity-60 blur-2xl" style={ratioStyle} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className={cn('relative w-full object-cover shadow-2xl', roundedCls)} style={ratioStyle} />
            </div>
          );
        }
        if (mode === 'overlay') {
          return (
            <div className={cn('relative w-full overflow-hidden', roundedCls)} style={ratioStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1) 60%)' }} />
            </div>
          );
        }
        if (mode === 'duotone') {
          return (
            <div className={cn('relative w-full overflow-hidden', roundedCls)} style={ratioStyle}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="h-full w-full object-cover" style={{ filter: 'grayscale(1) contrast(1.05)' }} />
              <div className="absolute inset-0 mix-blend-color" style={{ background: 'var(--primary)' }} />
            </div>
          );
        }
        if (mode === 'framed') {
          return (
            <div className="w-full rounded-2xl border border-border bg-card p-2 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className={cn('w-full object-cover', roundedCls)} style={ratioStyle} />
            </div>
          );
        }
        // cover: tall banner; inline (default): natural flow.
        const coverStyle = mode === 'cover' ? { aspectRatio: (p.ratio || '16/6').replace('/', ' / ') } : ratioStyle;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className={cn('w-full object-cover', roundedCls, mode === 'cover' && 'shadow-lg')} style={coverStyle} />
        );
      };

      const modes = imgModes(p);
      const uniform = modes.mobile === modes.tablet && modes.tablet === modes.desktop;
      if (uniform) {
        // Single mode across breakpoints. 'background' → nothing inline.
        return (variant(modes.mobile) as ReactElement) ?? <span className="hidden" data-img-bg="1" />;
      }
      // Different modes per breakpoint: render each visible in its own range.
      return (
        <div className="contents">
          {(['mobile', 'tablet', 'desktop'] as BP[]).map((bp) => {
            const v = variant(modes[bp]);
            return v ? <div key={bp} className={BP_SHOW[bp]}>{v}</div> : null;
          })}
        </div>
      );
    }

    case 'input':
    case 'textarea':
      return <Field node={node} />;

    case 'form':
      return (
        <BuilderForm formId={p.formId || 'form'} submitText={p.submitText || 'Отправить'} successMsg={p.successMsg || 'Спасибо!'}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} />
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
        return <div className={cn('flex aspect-video w-full items-center justify-center border border-dashed border-border text-sm text-muted-foreground', rounded)}>Видео</div>;
      }
      return isEmbed ? (
        <iframe src={src.replace('watch?v=', 'embed/')} title="video" className={cn('w-full border-0', rounded)} style={style} allowFullScreen />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
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
            <Link href={p.href || '#'} className={cn(buttonVariants({ variant: featured ? 'default' : 'outline' }), 'mt-auto')}>{p.cta}</Link>
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
      const cols = p.columns === '2' ? 'sm:grid-cols-2' : p.columns === '4' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';
      return (
        <div className={cn('grid gap-4', cols)}>
          {THEMES.slice(0, count).map((t) => {
            const d = t.dark;
            return (
              <Link
                key={t.id}
                href="/themes"
                className="group overflow-hidden rounded-2xl border shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ background: okl(d.background), color: okl(d.foreground), borderColor: okl(d.border) }}
              >
                <div className="p-5">
                  <span className="text-base font-bold tracking-tight">{t.label}</span>
                  <p className="mt-1 text-xs" style={{ color: okl(d['muted-foreground']) }}>{t.fontDisplay} · движение {t.motion}</p>
                  <div className="mt-4 flex gap-2">
                    {[d.primary, d.card, d.muted, d.foreground, d.border].map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-md" style={{ background: okl(c), border: `1px solid ${okl(d.border)}` }} />
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
      const count = Math.max(1, Math.min(12, parseInt(p.count || '6', 10) || 6));
      const entries = (mediaData as MediaEntry[]).slice(0, count);
      if (entries.length === 0) return null;
      return <VideoCardGrid entries={entries} />;
    }

    case 'authLogin':
      return <SiteAuthForm mode="login" title={p.title} submitText={p.submitText} successMsg={p.successMsg} />;

    case 'authRegister':
      return <SiteAuthForm mode="register" title={p.title} submitText={p.submitText} successMsg={p.successMsg} showName={p.showName !== 'false'} />;

    case 'authAccount':
      return <SiteAccount title={p.title} logoutText={p.logoutText} />;

    default:
      return null;
  }
}
