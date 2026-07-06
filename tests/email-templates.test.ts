import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderLoginOtpEmail, renderPasswordResetEmail, renderNewMemberEmail, OTP_SUBJECT, RESET_SUBJECT } from '@/lib/email-templates';

const OLD_ENV = { ...process.env };
beforeEach(() => {
  delete process.env.EMAIL_FROM;
});
afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe('renderLoginOtpEmail', () => {
  it('renders the code, brand and TTL in Russian', () => {
    const { subject, html, text } = renderLoginOtpEmail({ name: 'Анна', code: '482913', ttlMinutes: 10 });
    expect(subject).toBe(OTP_SUBJECT);
    expect(subject).toContain('Cinematic Web Kit');
    // each digit is rendered as its own styled cell
    for (const d of '482913') expect(html).toContain(`>${d}</span>`);
    expect(html).toContain('Анна');
    expect(html).toContain('10 минут');
    expect(html).toContain('#3c68d9'); // brand primary
    expect(text).toContain('482913');
  });

  it('escapes a hostile user name', () => {
    const { html } = renderLoginOtpEmail({ name: '<img src=x onerror=1>', code: '000000', ttlMinutes: 10 });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('greets impersonally when the name is empty', () => {
    const { html } = renderLoginOtpEmail({ name: '', code: '123456', ttlMinutes: 10 });
    expect(html).toContain('Здравствуйте!');
  });

  it('shows info@/support@/sales@ contacts derived from EMAIL_FROM', () => {
    process.env.EMAIL_FROM = 'noreply@kit.example';
    const { html } = renderLoginOtpEmail({ name: '', code: '123456', ttlMinutes: 10 });
    expect(html).toContain('info@kit.example');
    expect(html).toContain('support@kit.example');
    expect(html).toContain('sales@kit.example');
  });
});

describe('renderPasswordResetEmail', () => {
  it('renders the reset link as button + plain fallback', () => {
    const link = 'https://kit.example/reset-password?token=abc123';
    const { subject, html, text } = renderPasswordResetEmail({ name: 'Иван', link, ttlMinutes: 60 });
    expect(subject).toBe(RESET_SUBJECT);
    expect(html.split(link).length).toBeGreaterThanOrEqual(3); // href + visible fallback
    expect(html).toContain('Иван');
    expect(html).toContain('60 минут');
    expect(text).toContain(link);
  });

  it('escapes quotes in the link (attribute safety)', () => {
    const { html } = renderPasswordResetEmail({ name: '', link: 'https://x/"onmouseover="1', ttlMinutes: 60 });
    expect(html).not.toContain('"onmouseover="');
    expect(html).toContain('&quot;onmouseover=&quot;');
  });
});


describe('renderNewMemberEmail', () => {
  it('renders member, site, review link and subject', () => {
    const { subject, html, text } = renderNewMemberEmail({
      ownerName: 'Роман',
      siteName: 'Кофейня',
      memberEmail: 'guest@example.com',
      memberName: 'Гость',
      reviewUrl: 'https://kit.dev/dashboard/sites/s_1',
    });
    expect(subject).toContain('Кофейня');
    expect(html).toContain('Роман');
    expect(html).toContain('guest@example.com');
    expect(html).toContain('https://kit.dev/dashboard/sites/s_1');
    expect(text).toContain('Кофейня');
    expect(text).toContain('https://kit.dev/dashboard/sites/s_1');
  });

  it('escapes a hostile member name', () => {
    const { html } = renderNewMemberEmail({
      ownerName: '',
      siteName: 'S',
      memberEmail: 'a@b.c',
      memberName: '<script>x</script>',
      reviewUrl: 'https://kit.dev/x',
    });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('email localization (ru/en/hy)', () => {
  it('OTP subject and body switch to English', () => {
    const { subject, html } = renderLoginOtpEmail({ name: 'Anna', code: '482913', ttlMinutes: 10 }, 'en');
    expect(subject).toContain('sign-in verification code');
    expect(html).toContain('lang="en"');
    expect(html).toContain('Hello, ');
    expect(html).toContain('the cinematic website builder');
  });

  it('password reset switches to Armenian script', () => {
    const { subject, html } = renderPasswordResetEmail({ name: '', link: 'https://kit.example/r', ttlMinutes: 60 }, 'hy');
    expect(subject).toContain('Գաղտնաբառի վերականգնում');
    expect(html).toContain('lang="hy"');
    expect(html).toContain('Բարև Ձեզ');
  });

  it('new-member subject localizes to English while keeping the site name', () => {
    const { subject } = renderNewMemberEmail(
      { ownerName: 'R', siteName: 'Coffee', memberEmail: 'a@b.c', memberName: 'G', reviewUrl: 'https://k/x' },
      'en',
    );
    expect(subject).toBe('New membership request — Coffee');
  });

  it('defaults to Russian when no locale is passed', () => {
    const { subject } = renderLoginOtpEmail({ name: '', code: '000000', ttlMinutes: 10 });
    expect(subject).toBe(OTP_SUBJECT);
  });
});
