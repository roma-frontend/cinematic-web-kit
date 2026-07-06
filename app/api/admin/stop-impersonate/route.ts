import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getUserByToken, destroySession, getSessionToken, getSessionExpiry,
  SESSION_COOKIE, ADMIN_RETURN_COOKIE,
} from '@/lib/auth';

import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

// End impersonation: restore the stashed superadmin token. Deliberately does
// NOT require superadmin (the caller is currently the impersonated user) — it
// only trusts the httpOnly return cookie it set earlier.
export async function POST() {
  const t = apiErrors(await getLocale());
  const jar = await cookies();
  const returnToken = jar.get(ADMIN_RETURN_COOKIE)?.value;
  if (!returnToken || !getUserByToken(returnToken)) {
    jar.delete(ADMIN_RETURN_COOKIE);
    return NextResponse.json({ error: t.noActiveAdminSession }, { status: 400 });
  }

  // Drop the impersonation session, restore the superadmin cookie.
  const current = await getSessionToken();
  if (current && current !== returnToken) destroySession(current);

  const expiresAt = getSessionExpiry(returnToken) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const secure = process.env.NODE_ENV === 'production';
  jar.set(SESSION_COOKIE, returnToken, { httpOnly: true, sameSite: 'lax', secure, path: '/', expires: expiresAt });
  jar.delete(ADMIN_RETURN_COOKIE);
  return NextResponse.json({ ok: true });
}
