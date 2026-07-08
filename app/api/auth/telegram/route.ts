import { NextResponse } from 'next/server';
import { createSession, setSessionCookie, requestMeta, rateLimit } from '@/lib/auth';
import { getTelegramConfig } from '@/lib/telegram';
import { loginOrCreateTelegramUser, type TelegramAuthPayload, type TelegramLoginError } from '@/lib/telegram-auth';
import { recordAudit } from '@/lib/audit';
import { notifyRegistration } from '@/lib/notify';
import { getLocale } from '@/lib/i18n';
import { authDict } from '@/lib/auth-dict';

export const runtime = 'nodejs';

/** Public numeric bot id (the token prefix before ':') for the login widget.
 *  Not secret — it's embedded in the widget. Null when no token is configured. */
export async function GET() {
  const token = getTelegramConfig().token;
  const id = token ? token.split(':')[0] : '';
  return NextResponse.json({ botId: /^\d+$/.test(id) ? id : null });
}

// Sign in / sign up with the Telegram Login Widget. Verifies the HMAC server-
// side, enforces freshness, finds-or-creates the user and issues a session.
export async function POST(request: Request) {
  const t = authDict(await getLocale());
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`tg-auth:${ip}`, 20)) {
    return NextResponse.json({ error: t.telegram.tooMany }, { status: 429 });
  }

  let body: Partial<TelegramAuthPayload>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body.id || !body.auth_date || !body.hash) {
    return NextResponse.json({ error: t.telegram.badPayload }, { status: 400 });
  }

  const result = loginOrCreateTelegramUser({
    id: String(body.id),
    first_name: body.first_name,
    last_name: body.last_name,
    username: body.username,
    photo_url: body.photo_url,
    auth_date: String(body.auth_date),
    hash: String(body.hash),
  });

  if (!result.ok) {
    const map: Record<TelegramLoginError, { status: number; msg: string }> = {
      not_configured: { status: 503, msg: t.telegram.notConfigured },
      bad_signature: { status: 401, msg: t.telegram.badSignature },
      expired: { status: 401, msg: t.telegram.expired },
      suspended: { status: 403, msg: t.telegram.suspended },
    };
    const e = map[result.error];
    return NextResponse.json({ error: e.msg }, { status: e.status });
  }

  const { user, created } = result;
  const { token, expiresAt } = createSession(user.id, requestMeta(request));
  await setSessionCookie(token, expiresAt);

  if (created) {
    recordAudit({ id: user.id, email: user.email }, 'auth.register', user.email, `telegram @${user.telegramUsername ?? ''} ip=${ip}`);
    notifyRegistration({ name: user.name, email: user.telegramUsername ? `@${user.telegramUsername}` : user.email, role: user.role });
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
