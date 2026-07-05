import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { getUserById, setUserRole, deleteUser, countSuperadmins } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';
import type { Role } from '@/lib/db';

export const runtime = 'nodejs';

const ROLES: Role[] = ['customer', 'admin', 'superadmin'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  // Only a superadmin may change roles.
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: 'Нельзя изменить свою роль.' }, { status: 400 });

  let body: { role?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const role = body.role as Role;
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Неизвестная роль.' }, { status: 400 });

  const target = getUserById(id);
  if (!target) return NextResponse.json({ error: 'Пользователь не найден.' }, { status: 404 });

  // Never leave the platform without a superadmin.
  if (target.role === 'superadmin' && role !== 'superadmin' && countSuperadmins() <= 1) {
    return NextResponse.json({ error: 'Нельзя понизить последнего суперадмина.' }, { status: 400 });
  }

  setUserRole(id, role);
  recordAudit({ id: me.id, email: me.email }, 'role.change', target.email, `${target.role} → ${role}`);
  return NextResponse.json({ ok: true, id, role });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Не авторизован.' }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });

  const { id } = await params;
  if (id === me.id) return NextResponse.json({ error: 'Нельзя удалить себя.' }, { status: 400 });

  const target = getUserById(id);
  if (!target) return NextResponse.json({ error: 'Пользователь не найден.' }, { status: 404 });
  if (target.role === 'superadmin' && countSuperadmins() <= 1) {
    return NextResponse.json({ error: 'Нельзя удалить последнего суперадмина.' }, { status: 400 });
  }

  // FK cascade removes their sessions, sites and (via site) submissions.
  deleteUser(id);
  recordAudit({ id: me.id, email: me.email }, 'user.delete', target.email);
  return NextResponse.json({ ok: true, id });
}
