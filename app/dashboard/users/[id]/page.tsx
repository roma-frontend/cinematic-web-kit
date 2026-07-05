import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { userDossier } from '@/lib/admin';
import { UserDossierView } from '@/components/dashboard/user-dossier';

export const metadata = { title: 'Досье пользователя — Cinematic Kit' };
export const dynamic = 'force-dynamic';

export default async function UserDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/dashboard/users');
  if (!isSuperadmin(me)) redirect('/dashboard');

  const { id } = await params;
  const dossier = userDossier(id);
  if (!dossier) notFound();

  return <UserDossierView meId={me.id} dossier={dossier} />;
}
