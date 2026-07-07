// Subscription plans + the feature-entitlement matrix. Plans are STATIC config
// (kept in code, not the DB) — only live subscriptions/payments are persisted.
// Pricing follows the market: a cheap entry tier, a mid growth tier, and a top
// "Studio" tier that unlocks the ENTIRE builder (this is the deliberate upsell:
// every advanced builder capability is Studio-only).
//
// Yearly price = 10× monthly (two months free), the common SaaS convention.

export type PlanId = 'starter' | 'pro' | 'studio';
export type BillingInterval = 'month' | 'year';

/** Every gate-able capability in the product. Absence for a plan = denied. */
export type FeatureKey =
  // Sites / hosting
  | 'sites.publish'
  | 'sites.customDomain'
  | 'sites.members'
  | 'sites.removeBranding'
  // Builder (the deliberate Studio-only upsell surface)
  | 'builder.advancedCss'
  | 'builder.animation'
  | 'builder.hoverStates'
  | 'builder.customCss'
  | 'builder.effects'
  | 'builder.copyPasteStyle'
  // AI / media
  | 'ai.generate'
  // Ops
  | 'support.priority'
  | 'export.pdf';

export const ALL_FEATURES: FeatureKey[] = [
  'sites.publish',
  'sites.customDomain',
  'sites.members',
  'sites.removeBranding',
  'builder.advancedCss',
  'builder.animation',
  'builder.hoverStates',
  'builder.customCss',
  'builder.effects',
  'builder.copyPasteStyle',
  'ai.generate',
  'support.priority',
  'export.pdf',
];

export interface Plan {
  id: PlanId;
  /** Sort/upgrade order (higher = more capable). */
  rank: number;
  /** Price in the smallest currency unit (cents) per interval. */
  price: { month: number; year: number };
  currency: string;
  /** Hard limits (0 / null = none-or-unlimited depending on the key). */
  limits: {
    sites: number | null; // max sites the owner can keep (null = unlimited)
    aiPerMonth: number; // AI generations / month (0 = disabled)
  };
  /** Granted capabilities. */
  features: FeatureKey[];
  /** Marketing accent (drives the pricing-card gradient/glow). */
  accent: string;
  /** Highlight the "recommended" card. */
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    rank: 1,
    price: { month: 900, year: 9000 },
    currency: 'usd',
    limits: { sites: 1, aiPerMonth: 0 },
    features: ['sites.publish'],
    accent: '#64748b',
  },
  pro: {
    id: 'pro',
    rank: 2,
    price: { month: 2900, year: 29000 },
    currency: 'usd',
    limits: { sites: 5, aiPerMonth: 50 },
    features: [
      'sites.publish',
      'sites.customDomain',
      'sites.members',
      'sites.removeBranding',
      'ai.generate',
    ],
    accent: '#6366f1',
    popular: true,
  },
  studio: {
    id: 'studio',
    rank: 3,
    price: { month: 7900, year: 79000 },
    currency: 'usd',
    limits: { sites: null, aiPerMonth: 500 },
    // Studio unlocks EVERYTHING (all advanced builder capabilities live here).
    features: [...ALL_FEATURES],
    accent: '#a855f7',
  },
};

export const PLAN_IDS: PlanId[] = ['starter', 'pro', 'studio'];
export const PLAN_ORDER: Plan[] = PLAN_IDS.map((id) => PLANS[id]).sort((a, b) => a.rank - b.rank);

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && v in PLANS;
}
export function isInterval(v: unknown): v is BillingInterval {
  return v === 'month' || v === 'year';
}
export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

/** Does a specific plan grant a feature? */
export function planHasFeature(planId: PlanId, feature: FeatureKey): boolean {
  return PLANS[planId].features.includes(feature);
}

/** The lowest-rank plan that grants a feature (for "upgrade to X" hints). */
export function minPlanForFeature(feature: FeatureKey): Plan | null {
  return PLAN_ORDER.find((p) => p.features.includes(feature)) ?? null;
}

/** Price for a plan+interval, in cents. */
export function planPrice(planId: PlanId, interval: BillingInterval): number {
  return PLANS[planId].price[interval];
}

/** Effective monthly-equivalent price (yearly divided by 12) for comparisons. */
export function monthlyEquivalent(planId: PlanId, interval: BillingInterval): number {
  const p = PLANS[planId];
  return interval === 'year' ? Math.round(p.price.year / 12) : p.price.month;
}

/** Percentage saved by paying yearly vs 12× monthly (rounded). */
export function yearlySavingPct(planId: PlanId): number {
  const p = PLANS[planId];
  const monthlyTotal = p.price.month * 12;
  if (monthlyTotal === 0) return 0;
  return Math.round(((monthlyTotal - p.price.year) / monthlyTotal) * 100);
}

/** Format a cents amount as a currency string, e.g. 2900 → "$29". */
export function formatPrice(cents: number, currency = 'usd', locale = 'en-US'): string {
  const amount = cents / 100;
  const hasFraction = amount % 1 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
