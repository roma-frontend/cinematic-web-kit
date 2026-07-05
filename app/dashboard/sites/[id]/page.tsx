import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSiteForUser, listDomains, listSubmissions, APP_HOST } from '@/lib/sites';
import { listSiteUsers } from '@/lib/site-auth';
import { SiteSettings } from '@/components/dashboard/site-settings';

export const metadata = { title: 'Настройки сайта — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function SiteSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');

  const { id } = await params;
  const site = getSiteForUser(user.id, id);
  if (!site) notFound();

  return (
    <SiteSettings
      appHost={APP_HOST}
      serverIp={process.env.SERVER_IP || ''}
      site={{
        id: site.id,
        name: site.name,
        slug: site.slug,
        published: Boolean(site.publishedDoc),
        publishedAt: site.publishedAt?.toISOString() ?? null,
      }}
      initialDomains={listDomains(site.id).map((d) => ({
        id: d.id,
        hostname: d.hostname,
        verified: d.verified,
      }))}
      initialSubmissions={listSubmissions(site.id, 100).map((s) => ({
        id: s.id,
        formId: s.formId,
        data: JSON.parse(s.data) as Record<string, unknown>,
        createdAt: s.createdAt.toISOString(),
      }))}
      initialSiteUsers={listSiteUsers(site.id, 500).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
