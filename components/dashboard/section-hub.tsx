// Presentational section-hub (server component): a titled grid of cards that
// link to the sub-pages of a dashboard section. Used by the Staff / Superadmin
// section index routes so a parent nav item is a real, navigable landing page
// with its children laid out as cards.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/ui';

export interface HubCard {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Superadmin accent (amber) vs the default primary accent. */
  accent?: boolean;
}

export function SectionHub({
  title,
  subtitle,
  cards,
  openLabel,
}: {
  title: string;
  subtitle: string;
  cards: HubCard[];
  openLabel: string;
}) {
  return (
    <>
      <PageHeader title={title} description={subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                c.accent ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/10 text-primary'
              }`}
            >
              <c.icon className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{c.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              {openLabel} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
