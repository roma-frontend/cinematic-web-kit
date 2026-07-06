import { describe, it, expect } from 'vitest';
import { checkEnvironment } from '@/lib/env';

const R2_FULL = {
  R2_ACCOUNT_ID: 'a',
  R2_ACCESS_KEY_ID: 'b',
  R2_SECRET_ACCESS_KEY: 'c',
  R2_BUCKET: 'd',
};

describe('checkEnvironment', () => {
  it('warns about missing email/muapi with an otherwise empty env', () => {
    const issues = checkEnvironment({});
    const keys = issues.map((i) => i.key);
    expect(keys).toContain('EMAIL');
    expect(keys).toContain('MUAPI_KEY');
    expect(issues.every((i) => i.level === 'warn')).toBe(true);
  });

  it('flags a partial R2 config as an error', () => {
    const issues = checkEnvironment({ R2_ACCOUNT_ID: 'a', R2_BUCKET: 'd' });
    const r2 = issues.find((i) => i.key === 'R2');
    expect(r2?.level).toBe('error');
    expect(r2?.message).toMatch(/R2_ACCESS_KEY_ID/);
    expect(r2?.message).toMatch(/R2_SECRET_ACCESS_KEY/);
  });

  it('does not error on a complete R2 config, but warns without a public base url', () => {
    const issues = checkEnvironment(R2_FULL);
    expect(issues.some((i) => i.key === 'R2' && i.level === 'error')).toBe(false);
    expect(issues.some((i) => i.key === 'R2_PUBLIC_BASE_URL')).toBe(true);
  });

  it('is clean for R2 with public base url + an email provider + muapi', () => {
    const issues = checkEnvironment({
      ...R2_FULL,
      R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
      RESEND_API_KEY: 'x',
      MUAPI_KEY: 'y',
    });
    expect(issues).toHaveLength(0);
  });

  it('warns about APP_HOST only in production', () => {
    expect(checkEnvironment({ NODE_ENV: 'development' }).some((i) => i.key === 'NEXT_PUBLIC_APP_HOST')).toBe(false);
    expect(checkEnvironment({ NODE_ENV: 'production' }).some((i) => i.key === 'NEXT_PUBLIC_APP_HOST')).toBe(true);
  });
});
