import Link from 'next/link';
import { FileQuestion, Home, LayoutDashboard } from 'lucide-react';
import { getLocale } from '@/lib/i18n';
import { ui } from '@/lib/ui-dict';

// 404 — shown for unmatched routes in the main app.
export default async function NotFound() {
  const t = ui(await getLocale()).errors;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-6xl font-bold tracking-tighter text-foreground">404</h1>
        <h2 className="text-xl font-semibold text-foreground">{t.notFoundTitle}</h2>
        <p className="max-w-md text-muted-foreground">
          {t.notFoundDesc}
        </p>
      </div>

      <div className="mt-2 flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          {t.home}
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium shadow transition-colors hover:bg-accent"
        >
          <LayoutDashboard className="h-4 w-4" />
          {t.dashboard}
        </Link>
      </div>
    </div>
  );
}
