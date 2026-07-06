// Telegram alerts for critical superadmin-audit events. Optional: silently a
// no-op unless TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set. Fire-and-forget
// — a Telegram outage must never slow down or break the audited operation.

import 'server-only';

/** Audit actions that page the superadmin chat. */
const CRITICAL_ACTIONS: Record<string, string> = {
  'user.suspend': '🚫 Пользователь заблокирован',
  'user.activate': '✅ Пользователь разблокирован',
  'user.delete': '🗑 Пользователь удалён',
  'role.change': '👑 Изменена роль',
  'impersonate': '🎭 Вход под пользователем',
  'sessions.revoke_user': '🔒 Отозваны все сессии',
  'site.delete': '🗑 Удалён сайт',
  'db.export': '💾 Скачан файл БД',
  'data.snapshot': '💾 Снят JSON-снапшот БД',
  'auth.lockout': '🔐 Аккаунт заблокирован на 15 мин (перебор пароля)',
  'auth.password_reset': '🔑 Пароль сброшен по email-ссылке',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Push a critical audit event to the Telegram admin chat, if configured.
 * Never throws; returns immediately (delivery happens in the background).
 */
export function notifyCritical(action: string, actorEmail: string, target: string, detail: string): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const title = CRITICAL_ACTIONS[action];
  if (!token || !chatId || !title) return;

  const lines = [
    `<b>${title}</b>`,
    `Кто: ${esc(actorEmail)}`,
    target && `Объект: ${esc(target)}`,
    detail && `Детали: ${esc(detail)}`,
  ].filter(Boolean);

  void fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => { /* delivery is best-effort */ });
}
