import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { cleanupExpiredSessions } from '@/lib/admin';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// Superadmin maintenance actions: POST { action: 'cleanup-sessions' }.
export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: t.unauthorizedDot }, { status: 401 });
  if (!isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: { action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.action === 'cleanup-sessions') {
    const n = cleanupExpiredSessions();
    recordAudit({ id: me.id, email: me.email }, 'maintenance.cleanup_sessions', '', `${n} сессий удалено`);
    return NextResponse.json({ ok: true, removed: n });
  }
  return NextResponse.json({ error: t.unknownActionDot }, { status: 400 });
}
