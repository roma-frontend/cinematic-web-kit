// Finish the password reset: burn the emailed token, set the new password,
// clear any lockout and revoke every existing session (a stolen session must
// not survive a password change). The user then signs in normally.

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { hashPassword, rateLimit } from '@/lib/auth';
import { consumePasswordReset } from '@/lib/auth-codes';
import { getDb, sessions, users } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`reset:${ip}`, 10)) {
    return NextResponse.json({ error: t.tooManyAttemptsDot }, { status: 429 });
  }

  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const password = body.password ?? '';
  if (password.length < 8) {
    return NextResponse.json({ error: t.passwordMin8Dot }, { status: 400 });
  }
  if (password.length > 200) {
    return NextResponse.json({ error: t.passwordTooLong }, { status: 400 });
  }

  const userId = consumePasswordReset(body.token ?? '');
  if (!userId) {
    return NextResponse.json({ error: t.resetLinkInvalid }, { status: 400 });
  }

  const db = getDb();
  db.update(users)
    .set({ passwordHash: hashPassword(password), failedAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId))
    .run();
  db.delete(sessions).where(eq(sessions.userId, userId)).run();

  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (user) {
    recordAudit({ id: user.id, email: user.email }, 'auth.password_reset', user.email, `ip=${ip}`);
  }

  return NextResponse.json({ ok: true });
}
