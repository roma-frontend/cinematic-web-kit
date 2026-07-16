import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ResetPasswordForm } from '@/components/auth/password-reset';
import { getLocale } from '@/lib/i18n';
import { authDict } from '@/lib/auth-dict';

export async function generateMetadata() {
  return { title: authDict(await getLocale()).reset.metaReset };
}
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (await getCurrentUser()) redirect('/dashboard');
  const { token } = await searchParams;
  return (
    <Suspense>
      <ResetPasswordForm token={token ?? ''} />
    </Suspense>
  );
}
