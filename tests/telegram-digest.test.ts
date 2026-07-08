import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetDb } from './helpers';

const OLD_ENV = { ...process.env };

beforeEach(() => {
  resetDb();
  vi.restoreAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = 'tok';
  process.env.TELEGRAM_CHAT_ID = '42';
});
afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.unstubAllGlobals();
});

describe('telegram daily digest', () => {
  it('yerevanDateStr returns a YYYY-MM-DD string', async () => {
    const { yerevanDateStr } = await import('@/lib/telegram-digest');
    expect(yerevanDateStr(new Date('2026-07-08T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('buildDailyDigest renders the report sections', async () => {
    const { buildDailyDigest } = await import('@/lib/telegram-digest');
    const text = buildDailyDigest();
    expect(text).toContain('Ежедневный отчёт');
    expect(text).toContain('За последние 24 часа');
    expect(text).toContain('Всего на платформе');
  });

  it('sends when forced and dedupes per day', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { sendDailyDigest } = await import('@/lib/telegram-digest');

    const first = await sendDailyDigest({ force: true });
    expect(first.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second (non-forced) call the same day is deduped.
    const second = await sendDailyDigest();
    expect(second.skipped).toBe('already_sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('is skipped when the dailyDigest category is disabled', async () => {
    const { setJsonSetting } = await import('@/lib/platform-settings');
    setJsonSetting('telegram.categories', { dailyDigest: false });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { sendDailyDigest } = await import('@/lib/telegram-digest');
    const r = await sendDailyDigest({ force: true });
    expect(r.skipped).toBe('disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('daily scheduler', () => {
  it('arms a single timer and is idempotent', async () => {
    const g = globalThis as unknown as { __cwkDigestTimer?: ReturnType<typeof setTimeout> };
    delete g.__cwkDigestTimer;
    const { startDailyScheduler } = await import('@/lib/daily-scheduler');
    startDailyScheduler();
    const timer = g.__cwkDigestTimer;
    expect(timer).toBeDefined();
    startDailyScheduler(); // idempotent — same timer
    expect(g.__cwkDigestTimer).toBe(timer);
    clearTimeout(g.__cwkDigestTimer);
    delete g.__cwkDigestTimer;
  });
});
