'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { NavLink } from '@/lib/builder/types';
import { SiteAuthButtons } from './site-auth-blocks';
import { SiteThemeToggle } from './site-theme-toggle';

// Burger menu shown on mobile/tablet — nav links + auth buttons + theme toggle
// all collapse into a single dropdown so the top bar stays clean.
export function MobileNav({ links, authBase, showAuth }: { links: NavLink[]; authBase?: string; showAuth?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
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
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-3" onClick={() => setOpen(false)}>
                  <SiteAuthButtons base={authBase} />
                  <SiteThemeToggle />
                </div>
              )}
              {(!showAuth || authBase === undefined) && (
                <div className="mt-2 flex justify-end border-t border-border/60 pt-3">
                  <SiteThemeToggle />
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
