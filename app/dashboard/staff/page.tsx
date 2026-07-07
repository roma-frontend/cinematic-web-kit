import { redirect } from 'next/navigation';
import { Users, LayoutList, ScrollText } from 'lucide-react';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { isCapabilityEnabled } from '@/lib/access';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';
import { SectionHub, type HubCard } from '@/components/dashboard/section-hub';

export async function generateMetadata() {
  return { title: `${dashDict(await getLocale()).hub.staffTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

// Platform-staff section index: a real landing route for the "Platform staff"
// parent nav item, with its sub-pages laid out as cards. Honours the same role
// gate and per-role capability matrix as the individual staff pages.
export default async function StaffHubPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/staff');
  if (!isStaff(me)) redirect('/dashboard');

  const t = dashDict(await getLocale());
  const all = [
    { href: '/dashboard/users', key: 'users', icon: Users },
    { href: '/dashboard/all-sites', key: 'allSites', icon: LayoutList },
    { href: '/dashboard/audit', key: 'audit', icon: ScrollText },
  ] as const;

  const cards: HubCard[] = all
    .filter((c) => isCapabilityEnabled(me.role, c.key))
    .map((c) => ({ href: c.href, title: t.nav[c.key], description: t.hub.desc[c.key], icon: c.icon }));

  return <SectionHub title={t.hub.staffTitle} subtitle={t.hub.staffSubtitle} cards={cards} openLabel={t.hub.open} />;
}
