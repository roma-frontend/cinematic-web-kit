import { NextResponse } from 'next/server';
import { getCurrentUser, isSuperadmin } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import { getLocale } from '@/lib/i18n';
import { apiErrors } from '@/lib/api-errors-dict';
import { getJsonSetting, setJsonSetting } from '@/lib/platform-settings';
import {
  getTelegramConfig, getBotInfo, sendTelegramRaw, TELEGRAM_CATEGORIES,
  type TelegramCategory,
} from '@/lib/telegram';
import { sendDailyDigest } from '@/lib/telegram-digest';

export const runtime = 'nodejs';

interface StoredCore { token?: string; chatId?: string; enabled?: boolean; locale?: string }
const CORE_KEY = 'telegram';
const CATS_KEY = 'telegram.categories';

/** Public-safe view of the config: never leaks the bot token. */
function publicView() {
  const cfg = getTelegramConfig();
  const core = getJsonSetting<StoredCore>(CORE_KEY, {});
  return {
    enabled: core.enabled !== false,
    configured: cfg.enabled,
    hasToken: Boolean(cfg.token),
    chatId: cfg.chatId,
    categories: cfg.categories,
    // True when the token comes from an env var (read-only in the UI).
    tokenFromEnv: !core.token && Boolean(process.env.TELEGRAM_BOT_TOKEN),
  };
}

// GET → current config (no token) + live bot status.
export async function GET() {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });
  const view = publicView();
  const bot = view.hasToken ? await getBotInfo(getTelegramConfig().token) : { ok: false };
  return NextResponse.json({ ...view, bot });
}

// POST → { action: 'save' | 'test' | 'verify', ... }
export async function POST(request: Request) {
  const t = apiErrors(await getLocale());
  const me = await getCurrentUser();
  if (!me || !isSuperadmin(me)) return NextResponse.json({ error: t.forbidden }, { status: 403 });

  let body: {
    action?: string;
    token?: string;
    chatId?: string;
    enabled?: boolean;
    categories?: Record<string, boolean>;
  };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.action === 'save') {
    const prev = getJsonSetting<StoredCore>(CORE_KEY, {});
    // An empty token means "keep the existing one" (the UI never echoes it back).
    const token = (body.token ?? '').trim() || prev.token || '';
    const next: StoredCore = {
      token,
      chatId: (body.chatId ?? '').trim(),
      enabled: body.enabled !== false,
      locale: await getLocale(),
    };
    setJsonSetting(CORE_KEY, next, me.email);

    if (body.categories) {
      const cats = TELEGRAM_CATEGORIES.reduce((acc, c) => {
        acc[c] = body.categories![c] !== false;
        return acc;
      }, {} as Record<TelegramCategory, boolean>);
      setJsonSetting(CATS_KEY, cats, me.email);
    }

    recordAudit({ id: me.id, email: me.email }, 'settings.telegram', 'telegram', next.chatId ? `chat ${next.chatId}` : 'disabled');
    const view = publicView();
    const bot = view.hasToken ? await getBotInfo(getTelegramConfig().token) : { ok: false };
    return NextResponse.json({ ok: true, ...view, bot });
  }

  if (body.action === 'verify') {
    const token = (body.token ?? '').trim() || getTelegramConfig().token;
    const bot = await getBotInfo(token);
    return NextResponse.json({ ok: bot.ok, bot });
  }

  if (body.action === 'test') {
    // Prefer freshly-entered values (so the owner can test before saving).
    const cfg = getTelegramConfig();
    const token = (body.token ?? '').trim() || cfg.token;
    const chatId = (body.chatId ?? '').trim() || cfg.chatId;
    if (!token || !chatId) return NextResponse.json({ ok: false, error: 'Telegram не настроен' }, { status: 400 });
    const text = [
      '<b>✅ Builder Studio — тестовое сообщение</b>',
      '━━━━━━━━━━━━━━━━━━',
      '<b>Бот работает:</b> ✅',
      `<b>🕐 Время:</b> ${new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}`,
      '━━━━━━━━━━━━━━━━━━',
      '<i>Уведомления платформы подключены</i> 🚀',
    ].join('\n');
    const res = await sendTelegramRaw(text, { token, chatId });
    if (!res.ok) return NextResponse.json({ ok: false, error: res.description || 'send_failed' }, { status: 502 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'digest') {
    const r = await sendDailyDigest({ force: true });
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json(
      { ok: false, error: r.skipped === 'disabled' ? 'Дайджест выключен в категориях' : (r.error || 'send_failed') },
      { status: 400 },
    );
  }

  return NextResponse.json({ error: t.unknownAction }, { status: 400 });
}
