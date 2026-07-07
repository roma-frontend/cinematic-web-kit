import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ForcePasswordChange } from '@/components/auth/force-password-change';

export const metadata = { title: 'Смена пароля — Builder Studio', robots: { index: false, follow: false } as const };
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/change-password');
  return <ForcePasswordChange forced={Boolean(me.mustChangePassword)} />;
}
