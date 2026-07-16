import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth/auth-form';
import { getLocale } from '@/lib/i18n';
import { authDict } from '@/lib/auth-dict';

export async function generateMetadata() {
  return { title: authDict(await getLocale()).reset.metaRegister };
}
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
