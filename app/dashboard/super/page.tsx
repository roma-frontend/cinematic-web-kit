import { redirect } from 'next/navigation';
import { Building2, Database, KeyRound, Activity, Trash2, Crown, Film, CreditCard, Bell } from 'lucide-react';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { getLocale } from '@/lib/i18n';
import { dashDict } from '@/lib/dashboard-dict';
import { SectionHub, type HubCard } from '@/components/dashboard/section-hub';

export async function generateMetadata() {
  return { title: `${dashDict(await getLocale()).hub.superTitle} — Builder Studio` };
}
export const dynamic = 'force-dynamic';

// Superadmin section index: a real landing route for the "Superadmin" parent
// nav item, with every superadmin sub-page laid out as an accented card.
export default async function SuperHubPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/super');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const t = dashDict(await getLocale());
  const items = [
    { href: '/dashboard/organizations', key: 'organizations', icon: Building2 },
    { href: '/dashboard/database', key: 'database', icon: Database },
    { href: '/dashboard/access', key: 'access', icon: KeyRound },
    { href: '/dashboard/activity', key: 'activity', icon: Activity },
    { href: '/dashboard/trash', key: 'trash', icon: Trash2 },
    { href: '/dashboard/control', key: 'control', icon: Crown },
    { href: '/dashboard/notifications', key: 'notifications', icon: Bell },
    { href: '/dashboard/billing-admin', key: 'billingAdmin', icon: CreditCard },
    { href: '/studio', key: 'studio', icon: Film },
  ] as const;

  const cards: HubCard[] = items.map((c) => ({
    href: c.href,
    title: t.nav[c.key],
    description: t.hub.desc[c.key],
    icon: c.icon,
    accent: true,
  }));

  return <SectionHub title={t.hub.superTitle} subtitle={t.hub.superSubtitle} cards={cards} openLabel={t.hub.open} />;
}
