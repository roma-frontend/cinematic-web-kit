// Feature entitlements: resolve what a platform user is allowed to do based on
// their active subscription. The superadmin is unrestricted (owns the platform).
// A user with no active subscription falls back to the FREE_FEATURES set.
//
// This is the single gate the builder + APIs consult ("can this user use the
// animation engine / custom CSS / AI generation?"). Advanced builder features
// are Studio-only by design (see lib/billing/plans.ts).

import 'server-only';
import { getActiveSubscription } from '@/lib/billing/subscriptions';
import { PLANS, minPlanForFeature, type FeatureKey, type PlanId } from '@/lib/billing/plans';

/** Capabilities available WITHOUT any paid subscription (the free floor). */
export const FREE_FEATURES: FeatureKey[] = [];

export interface Entitlements {
  /** Effective plan id, or null when on the free floor. */
  planId: PlanId | null;
  /** True for the platform owner (superadmin) — unrestricted. */
  unlimited: boolean;
  features: Set<FeatureKey>;
  /** Convenience predicate. */
  has: (feature: FeatureKey) => boolean;
  limits: { sites: number | null; aiPerMonth: number };
}

function build(planId: PlanId | null, unlimited: boolean): Entitlements {
  const features = new Set<FeatureKey>(
    unlimited
      ? (Object.values(PLANS).flatMap((p) => p.features) as FeatureKey[])
      : planId
        ? PLANS[planId].features
        : FREE_FEATURES,
  );
  const limits = planId ? PLANS[planId].limits : { sites: 1, aiPerMonth: 0 };
  return {
    planId,
    unlimited,
    features,
    has: (f) => unlimited || features.has(f),
    limits: unlimited ? { sites: null, aiPerMonth: 1_000_000 } : limits,
  };
}

/** Resolve entitlements for a platform user. */
export function getUserEntitlements(user: { id: string; role?: string } | null | undefined): Entitlements {
  if (!user) return build(null, false);
  if (user.role === 'superadmin') return build('studio', true);
  const sub = getActiveSubscription(user.id);
  return build(sub ? (sub.planId as PlanId) : null, false);
}

/** Serializable snapshot for passing to client components. */
export interface EntitlementsDTO {
  planId: PlanId | null;
  unlimited: boolean;
  features: FeatureKey[];
  limits: { sites: number | null; aiPerMonth: number };
}

export function toDTO(e: Entitlements): EntitlementsDTO {
  return { planId: e.planId, unlimited: e.unlimited, features: [...e.features], limits: e.limits };
}

/** Which plan a user must upgrade to for a locked feature (for upsell UI). */
export function upgradeTargetFor(feature: FeatureKey): PlanId | null {
  return minPlanForFeature(feature)?.id ?? null;
}
