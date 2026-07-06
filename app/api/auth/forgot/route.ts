// "Забыли пароль?" — emails a one-shot reset link. The response is identical
// whether or not the address is registered (no account-enumeration oracle).

import { NextResponse } from 'next/server';
import { findUserByEmail, rateLimit, normalizeEmail } from '@/lib/auth';
import { createPasswordReset, RESET_TTL_MIN } from '@/lib/auth-codes';
import { sendEmail } from '@/lib/email';
import { renderPasswordResetEmail } from '@/lib/email-templates';
import { recordAudit } from '@/lib/audit';
import { APP_URL } from '@/lib/seo';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`forgot:${ip}`, 5)) {
    return NextResponse.json({ error: 'Слишком много запросов, подождите немного.' }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Некорректный email.' }, { status: 400 });
  }
  // Per-address throttle so one victim can't be flooded with reset emails.
  if (!rateLimit(`forgot-email:${email}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true });
  }

  const user = findUserByEmail(email);
  if (user && user.isActive) {
    const { token } = createPasswordReset(user);
    const link = `${APP_URL}/reset-password?token=${token}`;
    const mail = renderPasswordResetEmail({ name: user.name, link, ttlMinutes: RESET_TTL_MIN });
    const sent = await sendEmail({ to: user.email, ...mail });
    recordAudit(
      { id: user.id, email: user.email },
      sent.ok ? 'auth.reset_requested' : 'auth.reset_send_failed',
      user.email,
      `ip=${ip} provider=${sent.provider}`,
    );
  }

  // Always the same answer — the caller learns nothing about the address.
  return NextResponse.json({ ok: true });
}
