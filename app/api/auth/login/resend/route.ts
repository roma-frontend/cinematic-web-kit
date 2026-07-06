// Re-send the login OTP for a live challenge. Issues a fresh code (the old one
// dies), so a lost email never strands the user on the code screen.

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/auth';
import { challengeUser, createLoginOtp, maskEmail, OTP_TTL_MIN } from '@/lib/auth-codes';
import { sendEmail } from '@/lib/email';
import { renderLoginOtpEmail } from '@/lib/email-templates';
import { getLocale } from '@/lib/i18n';
import { recordAudit } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`otp-resend:${ip}`, 5)) {
    return NextResponse.json({ error: 'Слишком много запросов кода, подождите немного.' }, { status: 429 });
  }

  let body: { challenge?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const user = challengeUser(body.challenge ?? '');
  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'Сессия входа устарела. Войдите заново.' }, { status: 401 });
  }

  const { challengeId, code } = createLoginOtp(user);
  const locale = await getLocale();
  const mail = renderLoginOtpEmail({ name: user.name, code, ttlMinutes: OTP_TTL_MIN }, locale);
  const sent = await sendEmail({ to: user.email, ...mail });
  if (!sent.ok) {
    return NextResponse.json({ error: 'Не удалось отправить письмо. Попробуйте позже.' }, { status: 502 });
  }
  recordAudit({ id: user.id, email: user.email }, 'auth.otp_resent', user.email, `ip=${ip} provider=${sent.provider}`);
  return NextResponse.json({ ok: true, challenge: challengeId, email: maskEmail(user.email) });
}
