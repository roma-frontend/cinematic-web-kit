import { describe, it, expect } from 'vitest';
import {
  PLANS,
  PLAN_ORDER,
  planHasFeature,
  minPlanForFeature,
  planPrice,
  monthlyEquivalent,
  yearlySavingPct,
  formatPrice,
  isPlanId,
  isInterval,
  ALL_FEATURES,
} from '@/lib/billing/plans';

describe('plans', () => {
  it('orders plans by rank ascending', () => {
    expect(PLAN_ORDER.map((p) => p.id)).toEqual(['starter', 'pro', 'studio']);
  });

  it('studio unlocks every feature (the deliberate upsell)', () => {
    for (const f of ALL_FEATURES) expect(planHasFeature('studio', f)).toBe(true);
  });

  it('advanced builder features are Studio-only', () => {
    const builderFeatures = ALL_FEATURES.filter((f) => f.startsWith('builder.'));
    for (const f of builderFeatures) {
      expect(planHasFeature('studio', f)).toBe(true);
      expect(planHasFeature('pro', f)).toBe(false);
      expect(planHasFeature('starter', f)).toBe(false);
      expect(minPlanForFeature(f)?.id).toBe('studio');
    }
  });

  it('yearly price is 10x monthly (two months free)', () => {
    for (const p of Object.values(PLANS)) {
      expect(p.price.year).toBe(p.price.month * 10);
      expect(yearlySavingPct(p.id)).toBe(17); // ~2/12
    }
  });

  it('monthlyEquivalent amortizes yearly over 12', () => {
    expect(monthlyEquivalent('pro', 'month')).toBe(planPrice('pro', 'month'));
    expect(monthlyEquivalent('pro', 'year')).toBe(Math.round(PLANS.pro.price.year / 12));
  });

  it('formatPrice renders whole and fractional amounts', () => {
    expect(formatPrice(2900, 'usd', 'en-US')).toBe('$29');
    expect(formatPrice(2999, 'usd', 'en-US')).toBe('$29.99');
  });

  it('type guards', () => {
    expect(isPlanId('studio')).toBe(true);
    expect(isPlanId('nope')).toBe(false);
    expect(isInterval('year')).toBe(true);
    expect(isInterval('week')).toBe(false);
  });
});
