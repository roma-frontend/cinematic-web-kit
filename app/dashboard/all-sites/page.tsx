import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Rocket, CircleDashed, ExternalLink, LayoutList } from 'lucide-react';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { isCapabilityEnabled } from '@/lib/access';
import { listAllSites } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { PageHeader, EmptyState } from '@/components/dashboard/ui';
import { getLocale } from '@/lib/i18n';
import { staffDict } from '@/lib/staff-dict';
import { BCP47 } from '@/lib/seo';

export async function generateMetadata() {
  const t = staffDict(await getLocale());
  return { title: `${t.allMetaTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

export default async function AllSitesPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/all-sites');
  if (!isStaff(me)) redirect('/dashboard');
  if (!isCapabilityEnabled(me.role, 'allSites')) redirect('/dashboard');

  const locale = await getLocale();
  const t = staffDict(locale);
  const sites = listAllSites();

  return (
    <>
      <PageHeader title={t.allTitle} description={t.allSubtitle} />
      {sites.length === 0 ? (
        <EmptyState icon={LayoutList} title={t.allEmpty} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t.colSite}</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">{t.colOwner}</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">{t.colUpdated}</th>
                <th className="px-4 py-3 font-semibold">{t.colStatus}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sites.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">/s/{s.slug}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="truncate">{s.ownerName || t.dash}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.ownerEmail}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{new Date(s.updatedAt).toLocaleDateString(BCP47[locale])}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.published ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {s.published ? <Rocket className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                      {s.published ? t.published : t.draft}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/s/${s.slug}?draft=1`} target="_blank">
                      <Button size="sm" variant="ghost" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" /> {t.open}</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
