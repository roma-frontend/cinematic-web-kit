import { redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import {
  platformStats, systemInfo, recentActivity, listSessions, listUsers, listAllSites,
  livePulse, securityAlerts, dataQuality, backupStatus,
} from '@/lib/admin';
import { listAudit } from '@/lib/audit';
import { ControlCenter } from '@/components/dashboard/control-center';

export const metadata = { title: 'Центр контроля — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function ControlPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/control');
  if (!isSuperadmin(me)) redirect('/dashboard');

  return (
    <ControlCenter
      meId={me.id}
      stats={platformStats()}
      system={systemInfo()}
      activity={recentActivity(24)}
      sessions={listSessions(120)}
      users={listUsers()}
      sites={listAllSites()}
      audit={listAudit(120)}
      pulse={livePulse()}
      security={securityAlerts()}
      quality={dataQuality()}
      backup={backupStatus()}
    />
  );
}
