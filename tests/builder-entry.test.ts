import { describe, expect, it } from 'vitest';
import { resolveBuilderRouteSiteId } from '@/lib/builder-route';

describe('resolveBuilderRouteSiteId', () => {
  it('prefers an explicit site query parameter when present', () => {
    expect(resolveBuilderRouteSiteId('from-query', 'from-context')).toBe('from-query');
  });

  it('falls back to the tenant context site when the direct builder link omits ?site=', () => {
    expect(resolveBuilderRouteSiteId('', 'from-context')).toBe('from-context');
  });

  it('returns null when there is no site to open', () => {
    expect(resolveBuilderRouteSiteId('', '')).toBeNull();
  });
});
