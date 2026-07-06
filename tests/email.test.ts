import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_PROVIDER;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_REPLY_TO;
  delete process.env.AUTH_EMAIL_OTP;
});

afterEach(() => {
  process.env = { ...OLD_ENV };
  vi.unstubAllGlobals();
});

const MSG = { to: 'user@example.com', subject: 'Тест', html: '<b>hi</b>', text: 'hi' };

describe('emailConfigured / loginOtpEnabled', () => {
  it('is off without any provider key', async () => {
    const { emailConfigured, loginOtpEnabled } = await import('@/lib/email');
    expect(emailConfigured()).toBe(false);
    expect(loginOtpEnabled()).toBe(false);
  });

  it('is on with a key, and OTP honors the AUTH_EMAIL_OTP=off opt-out', async () => {
    process.env.RESEND_API_KEY = 'k';
    const { emailConfigured, loginOtpEnabled } = await import('@/lib/email');
    expect(emailConfigured()).toBe(true);
    expect(loginOtpEnabled()).toBe(true);
    process.env.AUTH_EMAIL_OTP = 'off';
    expect(loginOtpEnabled()).toBe(false);
  });
});

describe('sendEmail', () => {
  it('falls back to the console transport when unconfigured (no network)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { sendEmail } = await import('@/lib/email');
    const res = await sendEmail(MSG);
    expect(res).toEqual({ ok: true, provider: 'console' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0][0])).toContain('user@example.com');
  });

  it('sends via Resend with the Bearer key and sender identity', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.EMAIL_FROM = 'info@kit.dev';
    process.env.EMAIL_FROM_NAME = 'Cinematic Web Kit';
    process.env.EMAIL_REPLY_TO = 'support@kit.dev';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { sendEmail } = await import('@/lib/email');
    const res = await sendEmail(MSG);
    expect(res).toEqual({ ok: true, provider: 'resend' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer resend-key');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('Cinematic Web Kit <info@kit.dev>');
    expect(body.to).toEqual(['user@example.com']);
    expect(body.reply_to).toBe('support@kit.dev');
    expect(body.subject).toBe('Тест');
  });

  it('sends via Brevo with the api-key header', async () => {
    process.env.BREVO_API_KEY = 'brevo-key';
    process.env.EMAIL_FROM = 'info@kit.dev';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { sendEmail } = await import('@/lib/email');
    const res = await sendEmail(MSG);
    expect(res).toEqual({ ok: true, provider: 'brevo' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.headers['api-key']).toBe('brevo-key');
    const body = JSON.parse(init.body);
    expect(body.sender.email).toBe('info@kit.dev');
    expect(body.to).toEqual([{ email: 'user@example.com' }]);
    expect(body.htmlContent).toBe('<b>hi</b>');
  });

  it('fails over from Resend to Brevo when the first provider errors', async () => {
    process.env.RESEND_API_KEY = 'rk';
    process.env.BREVO_API_KEY = 'bk';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { sendEmail } = await import('@/lib/email');
    const res = await sendEmail(MSG);
    expect(res.ok).toBe(true);
    expect(res.provider).toBe('brevo');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('EMAIL_PROVIDER=brevo flips the order', async () => {
    process.env.RESEND_API_KEY = 'rk';
    process.env.BREVO_API_KEY = 'bk';
    process.env.EMAIL_PROVIDER = 'brevo';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { sendEmail } = await import('@/lib/email');
    const res = await sendEmail(MSG);
    expect(res.provider).toBe('brevo');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.brevo.com/v3/smtp/email');
  });

  it('reports failure (never throws) when every provider is down', async () => {
    process.env.RESEND_API_KEY = 'rk';
    const fetchMock = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('fetch', fetchMock);
    const { sendEmail } = await import('@/lib/email');
    const res = await sendEmail(MSG);
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
