// Per-user UI preferences: GET returns the whole prefs object for the current
// user, PATCH shallow-merges a partial update (null deletes a key). Available
// to every signed-in platform user — customer, admin and superadmin alike.

import { NextResponse } from 'next/server';
import { requireUser, unauthorized } from '@/lib/api-guard';
import { getUserPrefs, patchUserPrefs } from '@/lib/user-prefs';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return NextResponse.json({ prefs: getUserPrefs(user.id) });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = patchUserPrefs(user.id, patch);
  if (typeof result === 'string') return NextResponse.json({ error: result }, { status: 400 });
  return NextResponse.json({ ok: true, prefs: result });
}
