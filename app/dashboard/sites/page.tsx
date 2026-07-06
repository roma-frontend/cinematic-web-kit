import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listSitesForUser } from '@/lib/sites';
import { pendingCountsBySite } from '@/lib/site-membership';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = { title: 'Мои сайты — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function SitesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/sites');

  const owned = listSitesForUser(user.id);
  const pending = pendingCountsBySite(owned.map((s) => s.id));
  const sites = owned.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    published: Boolean(s.publishedDoc),
    updatedAt: s.updatedAt.toISOString(),
    pendingMembers: pending[s.id] ?? 0,
  }));

  return <DashboardClient initialSites={sites} />;
}
