import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth layer so we don't need a live request/cookie context.
const getCurrentUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => getCurrentUser(),
  isStaff: (u: { role?: string } | null) => u?.role === 'admin' || u?.role === 'superadmin',
}));

import { unauthorized, forbidden, requireUser, requireStaff } from '@/lib/api-guard';

beforeEach(() => {
  getCurrentUser.mockReset();
});

describe('response helpers', () => {
  it('unauthorized() → 401', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Не авторизован' });
  });
  it('forbidden() → 403', async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Недостаточно прав' });
  });
});

describe('requireUser', () => {
  it('returns the current user', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1', role: 'customer' });
    expect(await requireUser()).toEqual({ id: 'u1', role: 'customer' });
  });
  it('returns null when signed out', async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await requireUser()).toBeNull();
  });
});

describe('requireStaff', () => {
  it('returns staff users', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1', role: 'superadmin' });
    expect(await requireStaff()).not.toBeNull();
  });
  it('rejects non-staff', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1', role: 'customer' });
    expect(await requireStaff()).toBeNull();
  });
  it('rejects signed out', async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await requireStaff()).toBeNull();
  });
});
