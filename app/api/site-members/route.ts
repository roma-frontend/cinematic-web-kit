import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  requireSiteOwner,
  listMembers,
  setMemberStatus,
  listMaterialsForAdmin,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type MemberStatus,
} from '@/lib/site-membership';
import { getDb, sites } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

// Admin (site owner) management of an organization's members + materials.
// Requires a PLATFORM session and ownership of the site. Fully siteId-scoped.

const STATUSES: MemberStatus[] = ['pending', 'approved', 'rejected', 'suspended'];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const siteId = new URL(request.url).searchParams.get('site') ?? '';
  try {
    requireSiteOwner(user, siteId);
  } catch {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }
  return NextResponse.json({ members: listMembers(siteId), materials: listMaterialsForAdmin(siteId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }
  const action = typeof body.action === 'string' ? body.action : '';
  const siteId = typeof body.siteId === 'string' ? body.siteId : '';
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '');
  const bool = (k: string) => (typeof body[k] === 'boolean' ? (body[k] as boolean) : undefined);

  try {
    requireSiteOwner(user, siteId);
  } catch {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  switch (action) {
    case 'set-status': {
      const status = str('status') as MemberStatus;
      if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
      setMemberStatus(siteId, str('memberId'), status, user.id, str('reason'));
      return NextResponse.json({ ok: true });
    }
    case 'material-create': {
      const m = createMaterial(siteId, user.id, { title: str('title'), body: str('body'), url: str('url'), published: bool('published') });
      return NextResponse.json({ ok: true, material: m });
    }
    case 'material-update': {
      updateMaterial(siteId, str('materialId'), { title: str('title'), body: str('body'), url: str('url'), published: bool('published') });
      return NextResponse.json({ ok: true });
    }
    case 'material-delete': {
      deleteMaterial(siteId, str('materialId'));
      return NextResponse.json({ ok: true });
    }
    case 'set-approval-policy': {
      const require = bool('memberApproval');
      if (typeof require !== 'boolean') return NextResponse.json({ error: 'Неверное значение' }, { status: 400 });
      getDb().update(sites).set({ memberApproval: require, updatedAt: new Date() }).where(eq(sites.id, siteId)).run();
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  }
}
