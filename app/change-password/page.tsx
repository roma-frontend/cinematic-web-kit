import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ForcePasswordChange } from '@/components/auth/force-password-change';
import { getLocale } from '@/lib/i18n';
import { authDict } from '@/lib/auth-dict';

export async function generateMetadata() {
  return {
    title: authDict(await getLocale()).reset.metaChange,
    robots: { index: false, follow: false } as const,
  };
}
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/change-password');
  return <ForcePasswordChange forced={Boolean(me.mustChangePassword)} />;
}
