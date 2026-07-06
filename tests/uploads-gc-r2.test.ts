import { describe, it, expect, beforeEach, vi } from 'vitest';

// Drive the R2-backed branch of gcUploads by mocking the storage layer.
// vi.mock is hoisted above module init, so shared mocks go through vi.hoisted.
const { r2Delete } = vi.hoisted(() => ({ r2Delete: vi.fn(async (_key: string) => {}) }));
vi.mock('@/lib/storage', () => ({
  r2Configured: () => true,
  r2Delete,
  r2List: async () => {
    const past = Date.now() - 20 * 60 * 1000; // older than the 10-min grace
    return [
      { key: 'uploads/orphan-a.webp', lastModified: past },
      { key: 'uploads/orphan-b.webp', lastModified: past },
      { key: 'uploads/fresh.webp', lastModified: Date.now() }, // within grace → kept
    ];
  },
}));

import { gcUploads } from '@/lib/uploads-gc';
import { resetDb } from './helpers';

beforeEach(() => {
  resetDb();
  r2Delete.mockClear();
});

describe('gcUploads — R2 branch', () => {
  it('deletes orphaned objects past the grace window, keeps fresh ones', async () => {
    const { deleted } = await gcUploads();
    expect(deleted).toBe(2);
    const deletedKeys = r2Delete.mock.calls.map((c) => c[0]).sort();
    expect(deletedKeys).toEqual(['uploads/orphan-a.webp', 'uploads/orphan-b.webp']);
  });
});
