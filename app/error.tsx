'use client';

// Route-level error boundary. Catches render/runtime errors in a route segment
// and offers a retry without a full page reload.

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { ui } from '@/lib/ui-dict';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = ui(useLocale().locale).errors;
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
        <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.errTitle}</h1>
        <p className="max-w-lg text-muted-foreground">
          {t.errDesc}
        </p>
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted-foreground/50">{t.code} {error.digest}</p>
        )}
      </div>

      <div className="mt-2 flex gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          {t.retry}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium shadow transition-colors hover:bg-accent"
        >
          <Home className="h-4 w-4" />
          {t.home}
        </Link>
      </div>
    </div>
  );
}
