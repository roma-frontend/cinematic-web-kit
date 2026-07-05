import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Вход — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
