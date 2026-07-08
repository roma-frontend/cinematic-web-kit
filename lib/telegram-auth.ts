import 'server-only';
import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, newId, users, type User } from '@/lib/db';
import { getTelegramConfig } from '@/lib/telegram';

// Telegram Login Widget auth (ported 1:1 from caron's convex/auth.ts, adapted to
// this project's Node crypto + SQLite auth). The widget hands the client a
// signed payload; we re-verify the HMAC server-side with the bot token (never
// trusting the client), reject stale authorizations, then find-or-create a user
// keyed by Telegram id and let the caller issue a session.

/** The signed payload fields Telegram's Login Widget returns. */
export interface TelegramAuthPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

/** Reusable signatures: reject authorizations older than 24h (replay guard). */
export const TELEGRAM_AUTH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Verify the Login Widget HMAC. `data_check_string` = the received fields
 * (except `hash`) as `key=value`, sorted alphabetically and joined by "\n";
 * the key is SHA-256(botToken); compare the HMAC-SHA256 hex to `hash`.
 * See https://core.telegram.org/widgets/login
 */
export function verifyTelegramHash(fields: Record<string, string>, hash: string, botToken: string): boolean {
  const dataCheckString = Object.keys(fields)
    .filter((k) => k !== 'hash' && fields[k] !== undefined && fields[k] !== '')
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  // Constant-time compare over equal-length hex strings.
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(hash.toLowerCase(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Bootstrap superadmin Telegram usernames (comma-separated in env
 * `SUPERADMIN_TELEGRAM`, without '@'). Lets the owner sign in via Telegram and
 * be recognised as superadmin on first login.
 */
function bootstrapSuperadminTelegrams(): string[] {
  const raw = process.env.SUPERADMIN_TELEGRAM ?? '';
  return raw.split(',').map((s) => s.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
}

/** Is this Telegram username designated as a bootstrap superadmin? */
export function isSuperadminTelegram(username: string | undefined | null): boolean {
  if (!username) return false;
  return bootstrapSuperadminTelegrams().includes(username.replace(/^@/, '').toLowerCase());
}

/** A never-usable scrypt-shaped hash: Telegram accounts have no password. */
function unusablePasswordHash(): string {
  return `scrypt:16384:8:1:${randomBytes(16).toString('base64')}:${randomBytes(64).toString('base64')}`;
}

export type TelegramLoginError = 'not_configured' | 'bad_signature' | 'expired' | 'suspended';

export interface TelegramLoginResult {
  ok: true;
  user: User;
  created: boolean;
}
export interface TelegramLoginFailure {
  ok: false;
  error: TelegramLoginError;
}

/**
 * Verify a Login Widget payload and find-or-create the matching user.
 * Does NOT set a session cookie — the API route does that so this stays pure
 * and unit-testable. Uses the configured bot token (DB settings or env).
 */
export function loginOrCreateTelegramUser(payload: TelegramAuthPayload): TelegramLoginResult | TelegramLoginFailure {
  const token = getTelegramConfig().token;
  if (!token) return { ok: false, error: 'not_configured' };

  // Reconstruct exactly the fields Telegram signed (omit empty/optional ones).
  const fields: Record<string, string> = { id: payload.id, auth_date: payload.auth_date };
  if (payload.first_name) fields.first_name = payload.first_name;
  if (payload.last_name) fields.last_name = payload.last_name;
  if (payload.username) fields.username = payload.username;
  if (payload.photo_url) fields.photo_url = payload.photo_url;

  if (!verifyTelegramHash(fields, payload.hash, token)) return { ok: false, error: 'bad_signature' };

  const authDateMs = Number(payload.auth_date) * 1000;
  if (!Number.isFinite(authDateMs) || Date.now() - authDateMs > TELEGRAM_AUTH_MAX_AGE_MS) {
    return { ok: false, error: 'expired' };
  }

  const db = getDb();
  const wantsSuperadmin = isSuperadminTelegram(payload.username);
  let user = db.select().from(users).where(eq(users.telegramId, payload.id)).get() ?? null;
  let created = false;

  if (!user) {
    const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ').trim()
      || payload.username || `Telegram ${payload.id}`;
    // The very first account bootstraps the owner; otherwise a Telegram handle
    // in SUPERADMIN_TELEGRAM is promoted, else a normal customer.
    const isFirst = !db.select({ id: users.id }).from(users).limit(1).get();
    const row: User = {
      id: newId('u'),
      // Telegram gives no email — use a clearly-synthetic placeholder so the
      // NOT NULL/unique email invariant holds. The user can set a real one later.
      email: `tg_${payload.id}@telegram.local`,
      name,
      passwordHash: unusablePasswordHash(),
      role: isFirst || wantsSuperadmin ? 'superadmin' : 'customer',
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      totpSecret: null,
      totpEnabled: false,
      mustChangePassword: false,
      telegramId: payload.id,
      telegramUsername: payload.username ?? null,
      createdAt: new Date(),
    };
    db.insert(users).values(row).run();
    user = row;
    created = true;
  } else {
    // Keep the username fresh and promote the owner handle to superadmin.
    const patch: Partial<User> = {};
    if (payload.username && user.telegramUsername !== payload.username) patch.telegramUsername = payload.username;
    if (wantsSuperadmin && user.role !== 'superadmin') patch.role = 'superadmin';
    if (Object.keys(patch).length) {
      db.update(users).set(patch).where(eq(users.id, user.id)).run();
      user = { ...user, ...patch };
    }
  }

  if (!user.isActive) return { ok: false, error: 'suspended' };
  return { ok: true, user, created };
}
