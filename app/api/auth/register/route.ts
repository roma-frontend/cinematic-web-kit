import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createUser, findUserByEmail, rateLimit } from '@/lib/auth';
import { createRegistrationOtp, maskEmail, OTP_TTL_MIN } from '@/lib/auth-codes';
import { getDb, users } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { renderLoginOtpEmail } from '@/lib/email-templates';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`register:${ip}`, 10)) {
    return NextResponse.json({ error: t.tooManyAttemptsDot }, { status: 429 });
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  const password = body.password ?? '';
  const name = (body.name ?? '').trim();

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: t.invalidEmailDot }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: t.passwordMin8Dot }, { status: 400 });
  if (name.length > 80 || email.length > 254) return NextResponse.json({ error: t.dataTooLong }, { status: 400 });

  const existingUser = findUserByEmail(email);
  if (existingUser?.isActive) {
    return NextResponse.json({ error: t.emailTakenDot }, { status: 409 });
  }

  // A previous attempt may have created an inactive account but failed before
  // the user received or entered the code. Re-issue instead of stranding them.
  const user = existingUser ?? createUser(email, password, name);
  if (!existingUser) {
    getDb().update(users).set({ isActive: false }).where(eq(users.id, user.id)).run();
    user.isActive = false;
  }
  const { challengeId, code } = createRegistrationOtp(user);
  const locale = await getLocale();
  const mail = renderLoginOtpEmail({ name: user.name, code, ttlMinutes: OTP_TTL_MIN }, locale);
  const sent = await sendEmail({ to: user.email, ...mail });
  if (!sent.ok) {
    return NextResponse.json({ error: 'Не удалось отправить код подтверждения. Попробуйте позже.' }, { status: 502 });
  }
  recordAudit({ id: user.id, email: user.email }, 'auth.register_pending_verification', user.email, `ip=${ip} provider=${sent.provider}`);
  return NextResponse.json({ ok: true, verificationRequired: true, challenge: challengeId, email: maskEmail(user.email) });
}
