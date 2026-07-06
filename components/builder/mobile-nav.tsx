'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { NavLink } from '@/lib/builder/types';
import type { ChromeBtnStyles } from '@/lib/builder/chrome-buttons';
import { SiteAuthButtons } from './site-auth-blocks';
import { useLocale } from '@/hooks/use-locale';
import { siteRt } from '@/lib/site-runtime-dict';

// Burger menu shown on mobile/tablet — nav links + auth buttons collapse into a
// single dropdown. The theme toggle stays outside, always visible on the bar.
export function MobileNav({ links, authBase, showAuth, authStyles }: { links: NavLink[]; authBase?: string; showAuth?: boolean; authStyles?: ChromeBtnStyles }) {
  const [open, setOpen] = useState(false);
  const t = siteRt(useLocale().locale);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.closeMenu : t.openMenu}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-full border-b border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur-md"
          >
            <nav className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
              {showAuth && authBase !== undefined && (
                <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3" onClick={() => setOpen(false)}>
                  <SiteAuthButtons base={authBase} styles={authStyles} stacked />
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
