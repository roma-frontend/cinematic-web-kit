import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ForgotPasswordForm } from '@/components/auth/password-reset';
import { getLocale } from '@/lib/i18n';
import { authDict } from '@/lib/auth-dict';

export async function generateMetadata() {
  return { title: authDict(await getLocale()).reset.metaForgot };
}
export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
