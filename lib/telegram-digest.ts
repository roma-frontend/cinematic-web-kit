import 'server-only';
import { platformStats, livePulse } from '@/lib/admin';
import { getSetting, setSetting } from '@/lib/platform-settings';
import {
  getTelegramConfig, isCategoryEnabled, sendTelegramRaw, dashUrl, getNotifyLocale,
} from '@/lib/telegram';
import { notifyDict } from '@/lib/notify-dict';
import { BCP47 } from '@/lib/seo';

// Owner daily digest → Telegram (ported from caron's sendDailyDigest, adapted
// to Builder Studio's platform metrics). Sent automatically at 21:00 Yerevan
// time by the in-process scheduler (lib/daily-scheduler.ts), and on demand from
// the Control Center. Gated by the 'dailyDigest' category toggle.

export const DIGEST_HOUR = 21; // 21:00
export const DIGEST_TZ = 'Asia/Yerevan';
const LAST_SENT_KEY = 'telegram.digest.lastSent';

const RULE = '━━━━━━━━━━━━━━━━━━';

/** YYYY-MM-DD for a date in the Yerevan timezone (used to dedupe per day). */
export function yerevanDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DIGEST_TZ }).format(d);
}

/** Human date+time in Yerevan for the message footer. */
function yerevanNow(): string {
  return new Intl.DateTimeFormat(BCP47[getNotifyLocale()], {
    timeZone: DIGEST_TZ, dateStyle: 'long', timeStyle: 'short',
  }).format(new Date());
}

function trendArrow(delta: number): string {
  return delta > 0 ? `📈 +${delta}` : delta < 0 ? `📉 ${delta}` : '➖ 0';
}

/** Build the digest HTML from live platform metrics. */
export function buildDailyDigest(): string {
  const t = notifyDict(getNotifyLocale()).digest;
  const stats = platformStats();
  const pulse = livePulse();
  const line = (emoji: string, label: string, m: { last24h: number; prev24h: number }) =>
    `${emoji} <b>${label}:</b> ${m.last24h} <i>(${trendArrow(m.last24h - m.prev24h)})</i>`;

  const lines = [
    `<b>${t.title}</b>`,
    RULE,
    `<b>${t.last24h}</b>`,
    line('🎉', t.regs, pulse.registrations),
    line('🆕', t.newSites, pulse.newSites),
    line('🚀', t.publishes, pulse.publishes),
    line('📨', t.submissions, pulse.submissions),
    line('🔑', t.logins, pulse.logins),
    RULE,
    `<b>${t.totals}</b>`,
    `👥 <b>${t.users}:</b> ${stats.users}`,
    `🌐 <b>${t.sites}:</b> ${stats.sites} <i>(${t.published} ${stats.published})</i>`,
    `📥 <b>${t.leads}:</b> ${stats.submissions}`,
  ];

  if (pulse.hotSites.length) {
    lines.push(RULE, `<b>${t.hotSites}</b>`);
    for (const s of pulse.hotSites.slice(0, 5)) {
      lines.push(`• ${s.name} — ${t.siteLeads.replace('{n}', String(s.count))}`);
    }
  }

  lines.push(RULE, `🕐 ${yerevanNow()}`, '', `<a href="${dashUrl('/dashboard/control')}">${t.control}</a>`);
  return lines.join('\n');
}

export interface DigestResult { ok: boolean; skipped?: 'disabled' | 'already_sent'; error?: string }

/**
 * Send the daily digest. Deduped per Yerevan calendar day unless `force` is set
 * (manual "send now"). Best-effort — never throws.
 */
export async function sendDailyDigest(opts: { force?: boolean } = {}): Promise<DigestResult> {
  const cfg = getTelegramConfig();
  if (!isCategoryEnabled(cfg, 'dailyDigest')) return { ok: false, skipped: 'disabled' };

  const today = yerevanDateStr();
  if (!opts.force && getSetting(LAST_SENT_KEY) === today) {
    return { ok: false, skipped: 'already_sent' };
  }

  const res = await sendTelegramRaw(buildDailyDigest(), cfg);
  if (res.ok) setSetting(LAST_SENT_KEY, today, 'scheduler');
  return { ok: res.ok, error: res.description };
}
