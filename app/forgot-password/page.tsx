import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ForgotPasswordForm } from '@/components/auth/password-reset';

export const metadata = { title: 'Восстановление пароля — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
