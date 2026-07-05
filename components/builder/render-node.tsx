import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { BuilderForm } from './builder-form';
import { Accordion, Tabs } from './interactive';
import type { BuilderNode } from '@/lib/builder/types';

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

const pick = <T extends Record<string, string>>(map: T, key: string | undefined, fallback: keyof T): string =>
  map[(key ?? '') as keyof T] ?? map[fallback];

function Field({ node }: { node: BuilderNode }) {
  const p = node.props;
  const control =
    node.type === 'textarea' ? (
      <textarea
        name={p.name || 'field'}
        placeholder={p.placeholder}
        rows={4}
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
    ) : (
      <input
        name={p.name || 'field'}
        type={p.type || 'text'}
        placeholder={p.placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
    );
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm font-medium">
      {p.label ? <span>{p.label}</span> : null}
      {control}
    </label>
  );
}

export function RenderNode({ node }: { node: BuilderNode }) {
  const p = node.props ?? {};
  const kids = node.children ?? [];

  switch (node.type) {
    case 'section':
      return (
        <section className={cn(pick(PAD, p.padding, 'lg'), pick(BG, p.bg, 'none'))}>
          <div className={cn('mx-auto w-full px-6', pick(WIDTH, p.width, 'wide'))}>
            {kids.map((c) => (
              <RenderNode key={c.id} node={c} />
            ))}
          </div>
        </section>
      );

    case 'stack':
      return (
        <div className={cn('flex flex-col', pick(GAP, p.gap, 'md'), pick(ALIGN, p.align, 'stretch'))}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} />
          ))}
        </div>
      );

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

    case 'grid':
      return (
        <div className={cn('grid grid-cols-1', pick(COLS, p.columns, '3'), pick(GAP, p.gap, 'md'))}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={cn('flex flex-col', pick(GAP, p.gap, 'sm'), pick(PAD_BOX, p.padding, 'md'), p.bg === 'muted' ? 'bg-muted/50' : p.bg === 'none' ? '' : 'bg-card', p.border !== 'false' ? 'rounded-2xl border border-border' : '')}>
          {kids.map((c) => (
            <RenderNode key={c.id} node={c} />
          ))}
        </div>
      );

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
      const cls = cn(buttonVariants({ variant: (p.variant as Variant) || 'default', size: (p.size as 'default' | 'sm' | 'lg') || 'default' }));
      const wrap = pick(TEXT_ALIGN, p.align, 'left');
      const inner =
        p.type === 'submit' || p.type === 'reset' ? (
          <button type={p.type} className={cls}>
            {p.text}
          </button>
        ) : (
          <Link href={p.href || '#'} className={cls}>
            {p.text}
          </Link>
        );
      return <div className={wrap}>{inner}</div>;
    }

    case 'image':
      return p.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.src}
          alt={p.alt || ''}
          className={cn('w-full object-cover', p.rounded === 'full' ? 'rounded-full' : p.rounded === 'none' ? '' : 'rounded-xl')}
          style={p.ratio ? { aspectRatio: p.ratio.replace('/', ' / ') } : undefined}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Изображение
        </div>
      );

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

    case 'divider':
      return <hr className="my-6 border-border" />;

    case 'list': {
      const items = lines(p.items);
      const Tag = p.ordered === 'true' ? 'ol' : 'ul';
      return (
        <Tag className={cn('space-y-1.5 text-base leading-relaxed', p.marker !== 'false' ? (p.ordered === 'true' ? 'list-decimal pl-5' : 'list-disc pl-5') : 'list-none')}>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </Tag>
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
      return (
        <div className={cn('flex flex-col gap-4 rounded-2xl border p-6', featured ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card')}>
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

    case 'testimonial':
      return (
        <figure className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <blockquote className="text-lg leading-relaxed">“{p.quote}”</blockquote>
          <figcaption className="text-sm">
            <span className="font-semibold">{p.author}</span>
            {p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null}
          </figcaption>
        </figure>
      );

    case 'socials': {
      const links = lines(p.links).map((l) => {
        const [label, href] = l.split('|');
        return { label: (label ?? '').trim(), href: (href ?? '#').trim() };
      });
      return (
        <div className={cn('flex flex-wrap gap-2', pick(TEXT_ALIGN, p.align, 'left') === 'text-center' ? 'justify-center' : pick(TEXT_ALIGN, p.align, 'left') === 'text-right' ? 'justify-end' : 'justify-start')}>
          {links.map((l, i) => (
            <Link key={i} href={l.href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>{l.label}</Link>
          ))}
        </div>
      );
    }

    case 'faq':
      return <Accordion items={parsePairs(p.items)} />;

    case 'tabs':
      return <Tabs items={parsePairs(p.items)} />;

    case 'spacer':
      return <div className={pick(SPACE, p.height, 'md')} aria-hidden />;

    default:
      return null;
  }
}
