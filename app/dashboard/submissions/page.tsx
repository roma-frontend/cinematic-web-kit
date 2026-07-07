import { redirect } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { listSubmissionsForUser } from '@/lib/sites';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';
import { BCP47 } from '@/lib/seo';

export async function generateMetadata() {
  const t = dashDict(await getLocale());
  return { title: `${t.submissions.metaTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

function fields(json: string): [string, string][] {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    return Object.entries(obj).map(([k, v]) => [k, String(v)]);
  } catch {
    return [];
  }
}

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/submissions');

  const locale = await getLocale();
  const t = dashDict(locale).submissions;
  const rows = listSubmissionsForUser(user.id);

  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />
      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title={t.emptyTitle} description={t.emptyDesc} />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-0.5 font-semibold uppercase">{r.formId}</span>
                <span className="font-medium text-foreground">{r.siteName}</span>
                <span className="text-muted-foreground/70">/s/{r.siteSlug}</span>
                <span className="ml-auto">{r.createdAt.toLocaleString(BCP47[locale])}</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {fields(r.data).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-medium text-muted-foreground">{k}:</span>
                    <span className="min-w-0 break-words">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
