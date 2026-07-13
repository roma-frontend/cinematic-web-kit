import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));

import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as verifyRoute } from '@/app/api/auth/register/verify/route';
import { findUserByEmail } from '@/lib/auth';
import { resetDb } from './helpers';

beforeEach(() => {
  resetDb();
  delete process.env.RESEND_API_KEY;
  delete process.env.BREVO_API_KEY;
});

const request = (body: unknown) => new Request('http://test.local/api/auth/register', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.20.0.${Math.floor(Math.random() * 200)}` },
  body: JSON.stringify(body),
});

describe('registration verification', () => {
  it('keeps a new account inactive until its emailed code is verified', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const email = 'pending@example.com';
    const registration = await registerRoute(request({ email, password: 'password-123', name: 'Pending' }));
    expect(registration.status).toBe(200);
    const data = await registration.json();
    expect(data.verificationRequired).toBe(true);
    expect(findUserByEmail(email)?.isActive).toBe(false);

    const code = log.mock.calls.map((call) => String(call[0])).join('\n').match(/Ваш код: (\d{6})/)?.[1];
    expect(code).toBeTruthy();
    const verification = await verifyRoute(request({ challenge: data.challenge, code }));
    expect(verification.status).toBe(200);
    expect(findUserByEmail(email)?.isActive).toBe(true);
    log.mockRestore();
  });
});
