import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { listSitesForUser, listSubmissionsForUser } from '@/lib/sites';
import { listUsers } from '@/lib/admin';
import type { MentionEntity } from '@/lib/assistant-commands';

export const runtime = 'nodejs';

// Role-gated entity list for the assistant composer '@' mention picker.
// Customers see their own sites + submissions; staff also see platform users;
// superadmin sees everything. IDs never cross the caller's visibility boundary.

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const role = user.role;
  const entities: MentionEntity[] = [];

  listSitesForUser(user.id).forEach((s) => {
    entities.push({ id: s.id, type: 'site', label: s.name || s.slug, hint: s.slug });
  });

  if (role === 'customer' || role === 'superadmin') {
    listSubmissionsForUser(user.id, 200).forEach((sub) => {
      entities.push({
        id: sub.id,
        type: 'submission',
        label: sub.siteName,
        hint: `${sub.formId} · ${new Date(sub.createdAt).toLocaleDateString()}`,
      });
    });
  }

  if (role === 'admin' || role === 'superadmin') {
    listUsers().forEach((u) => {
      if (u.id === user.id) return;
      entities.push({ id: u.id, type: 'user', label: u.name || u.email, hint: `${u.email} · ${u.role}` });
    });
  }

  return NextResponse.json({ entities });
}
