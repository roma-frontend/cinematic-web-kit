import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Регистрация — Builder Studio' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
