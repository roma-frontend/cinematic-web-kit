import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe('notifyCritical', () => {
  it('is a no-op when Telegram is unconfigured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { notifyCritical } = await import('@/lib/notify');
    notifyCritical('user.delete', 'a@x.com', 'tgt', 'det');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('is a no-op for a non-critical action even when configured', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { notifyCritical } = await import('@/lib/notify');
    notifyCritical('not.a.critical.action', 'a@x.com', '', '');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('posts to Telegram when configured with a critical action', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'mytoken';
    process.env.TELEGRAM_CHAT_ID = '999';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { notifyCritical } = await import('@/lib/notify');
    notifyCritical('role.change', 'a<b>@x.com', 'target&', 'detail');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/botmytoken/sendMessage');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('999');
    expect(body.parse_mode).toBe('HTML');
    // HTML escaping of actor/target
    expect(body.text).toContain('a&lt;b&gt;@x.com');
    expect(body.text).toContain('target&amp;');
    vi.unstubAllGlobals();
  });
});
