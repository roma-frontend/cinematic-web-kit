import 'server-only';
import { getJsonSetting } from '@/lib/platform-settings';
import { isLocale, type Locale } from '@/lib/seo';

// ---------------------------------------------------------------------------
// Telegram integration core (adapted from caron's convex/notifications.ts to
// this project's Next.js + SQLite stack).
//
// Design goals:
//  • Config lives in the DB (Control Center-editable) with an env-var fallback,
//    so the owner reconfigures without a redeploy.
//  • Every send is fire-and-forget and never throws — a Telegram outage must
//    not slow down or break the operation that triggered the notification.
//  • Messages are rich HTML (parse_mode=HTML): emoji headers, ━ separators and
//    a footer link back into the dashboard, matching caron's polished style.
// ---------------------------------------------------------------------------

const API = 'https://api.telegram.org';
const TIMEOUT_MS = 8000;

/** Notification categories the owner can toggle independently. */
export type TelegramCategory =
  | 'registrations'
  | 'publishes'
  | 'submissions'
  | 'orgRequests'
  | 'subscriptions'
  | 'tickets'
  | 'security'
  | 'dailyDigest';

export const TELEGRAM_CATEGORIES: TelegramCategory[] = [
  'registrations', 'publishes', 'submissions', 'orgRequests', 'subscriptions', 'tickets', 'security', 'dailyDigest',
];

export interface TelegramConfig {
  token: string;
  chatId: string;
  enabled: boolean;
  categories: Record<TelegramCategory, boolean>;
}

const SETTINGS_KEY = 'telegram';
const CATS_KEY = 'telegram.categories';

interface StoredCore { token?: string; chatId?: string; enabled?: boolean; locale?: string }

/** All categories default to ON so a freshly-configured bot is useful at once. */
function defaultCategories(): Record<TelegramCategory, boolean> {
  return TELEGRAM_CATEGORIES.reduce(
    (acc, c) => ((acc[c] = true), acc),
    {} as Record<TelegramCategory, boolean>,
  );
}

/**
 * Resolve the effective Telegram config: DB settings take precedence, falling
 * back to the TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars. `enabled` is true
 * only when both a token and a chat id are present and the toggle isn't off.
 */
export function getTelegramConfig(): TelegramConfig {
  const core = getJsonSetting<StoredCore>(SETTINGS_KEY, {});
  const token = (core.token || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (core.chatId || process.env.TELEGRAM_CHAT_ID || '').trim();
  const categories = { ...defaultCategories(), ...getJsonSetting<Partial<Record<TelegramCategory, boolean>>>(CATS_KEY, {}) };
  const enabledFlag = core.enabled !== false; // undefined => on
  return { token, chatId, enabled: enabledFlag && Boolean(token && chatId), categories };
}

/** Whether the integration is fully configured and a given category is enabled. */
export function isCategoryEnabled(cfg: TelegramConfig, category: TelegramCategory): boolean {
  return cfg.enabled && cfg.categories[category] !== false;
}

/**
 * Locale for message CONTENT — the language the superadmin picked when saving
 * the Telegram settings (there's no request locale at scheduler/event time).
 * Falls back to 'ru'.
 */
export function getNotifyLocale(): Locale {
  const raw = getJsonSetting<StoredCore>(SETTINGS_KEY, {}).locale;
  return isLocale(raw) ? raw : 'ru';
}

/** HTML-escape user-supplied text before embedding it in an HTML message. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Public dashboard base URL for footer links (no trailing slash). */
export function appBase(): string {
  const host = (process.env.NEXT_PUBLIC_APP_HOST || process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (!host) return '';
  const withProto = /^https?:\/\//.test(host) ? host : `https://${host}`;
  return withProto.replace(/\/+$/, '');
}

/** Build an absolute dashboard URL, or a bare path when no host is configured. */
export function dashUrl(path: string): string {
  const base = appBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

interface SendResult { ok: boolean; description?: string }

/**
 * Low-level send. Resolves to {ok} and never rejects. Pass an explicit config
 * (e.g. an unsaved one from the test button) or omit to use the stored config.
 */
export async function sendTelegramRaw(text: string, cfg?: Pick<TelegramConfig, 'token' | 'chatId'>): Promise<SendResult> {
  const token = cfg?.token ?? getTelegramConfig().token;
  const chatId = cfg?.chatId ?? getTelegramConfig().chatId;
  if (!token || !chatId) return { ok: false, description: 'not_configured' };
  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as SendResult | null;
    if (!res.ok || !data?.ok) return { ok: false, description: data?.description || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, description: e instanceof Error ? e.message : 'network_error' };
  }
}

/**
 * Fire-and-forget send gated by category. Use for event notifications; returns
 * immediately so the caller isn't blocked on Telegram.
 */
export function notifyTelegram(category: TelegramCategory, text: string): void {
  const cfg = getTelegramConfig();
  if (!isCategoryEnabled(cfg, category)) return;
  void sendTelegramRaw(text, cfg);
}

/** Fetch the bot's own profile (used to show connection status in the UI). */
export async function getBotInfo(token: string): Promise<{ ok: boolean; username?: string; name?: string; description?: string }> {
  if (!token) return { ok: false };
  try {
    const res = await fetch(`${API}/bot${token}/getMe`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = (await res.json().catch(() => null)) as
      | { ok: boolean; result?: { username?: string; first_name?: string }; description?: string }
      | null;
    if (!res.ok || !data?.ok) return { ok: false, description: data?.description };
    return { ok: true, username: data.result?.username, name: data.result?.first_name };
  } catch {
    return { ok: false };
  }
}

/**
 * Resolve an @username (or numeric id) to a numeric chat_id via getUpdates.
 * Most reliable right after the user presses "Start" in the bot. Returns null
 * when unresolvable. (Ported from caron's resolveTelegramChatId.)
 */
export async function resolveChatId(token: string, rawUsername: string): Promise<string | null> {
  const username = rawUsername.replace(/^@/, '').trim();
  if (!username) return null;
  if (/^-?\d+$/.test(username)) return username; // already a numeric chat_id
  try {
    const res = await fetch(`${API}/bot${token}/getUpdates`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const data = (await res.json()) as {
      ok: boolean;
      result?: Array<{ message?: { chat?: { id: number; username?: string } } }>;
    };
    const match = data.ok
      ? data.result?.find((u) => u.message?.chat?.username?.toLowerCase() === username.toLowerCase())
      : undefined;
    return match?.message?.chat?.id ? String(match.message.chat.id) : null;
  } catch {
    return null;
  }
}
