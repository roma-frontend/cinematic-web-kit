'use client';

import type { ReactNode } from 'react';

/**
 * Ensures wide tables remain usable on small screens: adds horizontal scroll
 * with safe gutters on mobile. Use to wrap <table> or grid lists.
 */
export function TableScrollWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-3 overflow-x-auto sm:mx-0 ${className ?? ''}`}>
      <div className="inline-block min-w-full align-middle">
        {children}
      </div>
    </div>
  );
}
