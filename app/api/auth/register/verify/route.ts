import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createSession, rateLimit, requestMeta, setSessionCookie } from '@/lib/auth';
import { verifyRegistrationOtp } from '@/lib/auth-codes';
import { getDb, users } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { notifyRegistration } from '@/lib/notify';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`register-verify:${ip}`, 30)) {
    return NextResponse.json({ error: t.tooManyAttemptsDot }, { status: 429 });
  }

  let body: { challenge?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const verdict = verifyRegistrationOtp(body.challenge ?? '', (body.code ?? '').trim());
  if (verdict.status === 'expired') return NextResponse.json({ error: t.otpExpiredRegister }, { status: 401 });
  if (verdict.status === 'too_many') return NextResponse.json({ error: t.otpTooManyRegister }, { status: 429 });
  if (verdict.status === 'invalid') {
    return NextResponse.json({ error: t.otpInvalid.replace('{n}', String(verdict.attemptsLeft)) }, { status: 401 });
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, verdict.userId)).get();
  if (!user) return NextResponse.json({ error: t.accountNotFound }, { status: 404 });

  db.update(users).set({ isActive: true }).where(eq(users.id, user.id)).run();
  const { token, expiresAt } = createSession(user.id, requestMeta(request));
  await setSessionCookie(token, expiresAt);
  recordAudit({ id: user.id, email: user.email }, 'auth.register_verified', user.email, `ip=${ip}`);
  notifyRegistration({ name: user.name, email: user.email, role: user.role });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}
