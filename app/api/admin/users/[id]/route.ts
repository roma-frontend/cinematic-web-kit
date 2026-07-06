import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { getUserById, setUserRole, setUserActive, deleteUser, countSuperadmins, revokeUserSessions } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';
import type { Role } from '@/lib/db';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

const ROLES: Role[] = ['customer', 'admin', 'superadmin'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  // Only a superadmin may change roles.
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: t.cannotChangeOwnAccount }, { status: 400 });

  let body: { role?: string; action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const target = getUserById(id);
  if (!target) return NextResponse.json({ error: t.userNotFound }, { status: 404 });

  // Suspend / reinstate. Suspension also kills every live session immediately.
  if (body.action === 'suspend' || body.action === 'activate') {
    const suspend = body.action === 'suspend';
    if (suspend && target.role === 'superadmin' && countSuperadmins() <= 1) {
      return NextResponse.json({ error: t.cannotBlockLastSuperadmin }, { status: 400 });
    }
    setUserActive(id, !suspend);
    const revoked = suspend ? revokeUserSessions(id) : 0;
    recordAudit(
      { id: me.id, email: me.email },
      suspend ? 'user.suspend' : 'user.activate',
      target.email,
      suspend ? `${revoked} сессий завершено` : '',
    );
    return NextResponse.json({ ok: true, id, isActive: !suspend });
  }

  const role = body.role as Role;
  if (!ROLES.includes(role)) return NextResponse.json({ error: t.unknownRole }, { status: 400 });

  // Never leave the platform without a superadmin.
  if (target.role === 'superadmin' && role !== 'superadmin' && countSuperadmins() <= 1) {
    return NextResponse.json({ error: t.cannotDemoteLastSuperadmin }, { status: 400 });
  }

  setUserRole(id, role);
  recordAudit({ id: me.id, email: me.email }, 'role.change', target.email, `${target.role} → ${role}`);
  return NextResponse.json({ ok: true, id, role });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: t.cannotDeleteSelf }, { status: 400 });

  const target = getUserById(id);
  if (!target) return NextResponse.json({ error: t.userNotFound }, { status: 404 });
  if (target.role === 'superadmin' && countSuperadmins() <= 1) {
    return NextResponse.json({ error: t.cannotDeleteLastSuperadmin }, { status: 400 });
  }

  // FK cascade removes their sessions, sites and (via site) submissions.
  deleteUser(id);
  recordAudit({ id: me.id, email: me.email }, 'user.delete', target.email);
  return NextResponse.json({ ok: true, id });
}
