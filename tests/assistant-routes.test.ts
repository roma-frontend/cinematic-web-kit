import { describe, it, expect } from 'vitest';
import {
  assistantRoutesForRole,
  assistantDataForRole,
  ASSISTANT_ROUTES,
  ASSISTANT_DATA_KEYS,
} from '@/lib/assistant-routes';

describe('assistantRoutesForRole', () => {
  it('returns customer routes for customer', () => {
    const routes = assistantRoutesForRole('customer');
    expect(routes).toContain('/dashboard');
    expect(routes).toContain('/dashboard/sites');
    expect(routes).toContain('/studio/builder');
    expect(routes).not.toContain('/dashboard/users');
    expect(routes).not.toContain('/dashboard/super');
  });

  it('expands routes for admin', () => {
    const routes = assistantRoutesForRole('admin');
    expect(routes).toContain('/dashboard/users');
    expect(routes).toContain('/dashboard/all-sites');
    expect(routes).not.toContain('/dashboard/super');
  });

  it('returns every route for superadmin', () => {
    const routes = assistantRoutesForRole('superadmin');
    expect(routes).toContain('/dashboard/super');
    expect(routes).toContain('/studio');
    expect(routes.length).toBeGreaterThan(assistantRoutesForRole('admin').length);
  });

  it('falls back to customer routes for an unknown role', () => {
    // @ts-expect-error intentional unknown role
    const routes = assistantRoutesForRole('guest');
    expect(routes).toEqual(assistantRoutesForRole('customer'));
  });

  it('exposes the union of all routes', () => {
    expect(ASSISTANT_ROUTES).toEqual(assistantRoutesForRole('superadmin'));
  });
});

describe('assistantDataForRole', () => {
  it('gives customers only their own sites', () => {
    expect(assistantDataForRole('customer')).toEqual(['my-sites']);
  });

  it('gives staff all data sets', () => {
    expect(assistantDataForRole('admin')).toEqual(['my-sites', 'users', 'all-sites']);
    expect(assistantDataForRole('superadmin')).toEqual(['my-sites', 'users', 'all-sites']);
  });

  it('falls back to customer data for an unknown role', () => {
    // @ts-expect-error intentional unknown role
    expect(assistantDataForRole('guest')).toEqual(['my-sites']);
  });

  it('exposes the union of all data keys', () => {
    expect(ASSISTANT_DATA_KEYS).toEqual(['my-sites', 'users', 'all-sites']);
  });
});
