import { NextResponse } from 'next/server';
import {
  DUMMY_HASH,
  clearLoginFailures,
  createSession,
  findUserByEmail,
  lockRemainingMs,
  rateLimit,
  recordLoginFailure,
  requestMeta,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { createLoginOtp, maskEmail, OTP_TTL_MIN } from '@/lib/auth-codes';
import { loginOtpEnabled, sendEmail } from '@/lib/email';
import { renderLoginOtpEmail } from '@/lib/email-templates';
import { getLocale } from '@/lib/i18n';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`login:${ip}`, 15)) {
    return NextResponse.json({ error: 'Слишком много попыток, подождите немного.' }, { status: 429 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const user = findUserByEmail(body.email ?? '');

  // Account lockout after repeated failures (checked before the password so a
  // locked account can't be brute-forced at all).
  if (user) {
    const remaining = lockRemainingMs(user);
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60_000);
      return NextResponse.json(
        { error: `Аккаунт временно заблокирован из-за неудачных попыток входа. Попробуйте через ${minutes} мин.` },
        { status: 429 },
      );
    }
  }

  // Always verify against something so a missing user costs the same time
  // as a wrong password (no account-enumeration timing oracle).
  const ok = user
    ? verifyPassword(body.password ?? '', user.passwordHash)
    : (verifyPassword('invalid', DUMMY_HASH), false);

  if (!ok || !user) {
    if (user) {
      const lockedNow = recordLoginFailure(user);
      recordAudit(
        { id: user.id, email: user.email },
        lockedNow ? 'auth.lockout' : 'auth.login_failed',
        user.email,
        `ip=${ip}`,
      );
    }
    return NextResponse.json({ error: 'Неверный email или пароль.' }, { status: 401 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: 'Аккаунт заблокирован администратором.' }, { status: 403 });
  }

  clearLoginFailures(user);

  // Second factor: email a 6-digit code and stop before creating the session.
  // If the email provider is down, fall back to a direct login — an outage
  // must degrade security gracefully, never lock every user out.
  if (loginOtpEnabled()) {
    const { challengeId, code } = createLoginOtp(user);
    const locale = await getLocale();
    const mail = renderLoginOtpEmail({ name: user.name, code, ttlMinutes: OTP_TTL_MIN }, locale);
    const sent = await sendEmail({ to: user.email, ...mail });
    if (sent.ok) {
      recordAudit({ id: user.id, email: user.email }, 'auth.otp_sent', user.email, `ip=${ip} provider=${sent.provider}`);
      return NextResponse.json({ ok: true, otpRequired: true, challenge: challengeId, email: maskEmail(user.email) });
    }
    recordAudit({ id: user.id, email: user.email }, 'auth.otp_send_failed', user.email, `${sent.provider}: ${sent.error ?? ''}`);
  }

  const { token, expiresAt } = createSession(user.id, requestMeta(request));
  await setSessionCookie(token, expiresAt);
  recordAudit({ id: user.id, email: user.email }, 'auth.login', user.email, `ip=${ip}`);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}
