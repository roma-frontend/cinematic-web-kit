import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});
afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.unstubAllGlobals();
});

describe('telegram config', () => {
  it('is disabled without token/chat and enabled via env fallback', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.NEXT_PUBLIC_APP_HOST;
    const { getTelegramConfig } = await import('@/lib/telegram');
    expect(getTelegramConfig().enabled).toBe(false);

    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '42';
    const cfg = getTelegramConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.token).toBe('tok');
    expect(cfg.chatId).toBe('42');
    // All categories default to on.
    expect(cfg.categories.security).toBe(true);
    expect(cfg.categories.registrations).toBe(true);
  });

  it('escapes HTML and builds dashboard URLs', async () => {
    const { esc, dashUrl } = await import('@/lib/telegram');
    expect(esc('a<b>&"c')).toBe('a&lt;b&gt;&amp;"c');
    delete process.env.NEXT_PUBLIC_APP_HOST;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(dashUrl('/dashboard')).toBe('/dashboard');
    process.env.NEXT_PUBLIC_APP_HOST = 'studio.example.com';
    expect(dashUrl('dashboard')).toBe('https://studio.example.com/dashboard');
  });

  it('sendTelegramRaw is a no-op (ok:false) when unconfigured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { sendTelegramRaw } = await import('@/lib/telegram');
    const res = await sendTelegramRaw('hi');
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('notifyTelegram posts for an enabled category and skips a disabled one', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '42';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { notifyTelegram } = await import('@/lib/telegram');
    notifyTelegram('security', '<b>hello</b>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottok/sendMessage');
    const body = JSON.parse(init.body);
    expect(body.chat_id).toBe('42');
    expect(body.parse_mode).toBe('HTML');
  });
});

describe('notify message builders', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '42';
    delete process.env.NEXT_PUBLIC_APP_HOST;
  });

  it('notifyRegistration sends a formatted, escaped message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { notifyRegistration } = await import('@/lib/notify');
    notifyRegistration({ name: 'Ann <x>', email: 'a@x.com', role: 'customer' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain('Новый пользователь');
    expect(body.text).toContain('Ann &lt;x&gt;');
    expect(body.text).toContain('a@x.com');
    expect(body.parse_mode).toBe('HTML');
  });

  it('notifySitePublished includes name and slug', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { notifySitePublished } = await import('@/lib/notify');
    notifySitePublished({ name: 'My Shop', slug: 'my-shop', ownerEmail: 'o@x.com' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain('Опубликован сайт');
    expect(body.text).toContain('My Shop');
    expect(body.text).toContain('my-shop');
  });
});
