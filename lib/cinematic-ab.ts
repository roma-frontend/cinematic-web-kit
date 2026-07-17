export interface ABTestVariant {
  id: string;
  dnaId: string;
  label: string;
  videoUrl?: string;
  imageUrl?: string;
  impressions: number;
  conversions: number;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: number;
  endDate?: number;
  winner?: string;
  createdAt: number;
}

export function createABTest(
  name: string,
  description: string,
  dnaIds: string[]
): ABTest {
  const variants: ABTestVariant[] = dnaIds.map((dnaId, i) => ({
    id: `variant-${i + 1}`,
    dnaId,
    label: `Variant ${String.fromCharCode(65 + i)}`,
    impressions: 0,
    conversions: 0,
  }));

  return {
    id: `test-${Date.now()}`,
    name,
    description,
    variants,
    status: 'draft',
    createdAt: Date.now(),
  };
}

export function getVariantForUser(
  test: ABTest,
  userId: string
): ABTestVariant | null {
  if (test.status !== 'running') return null;

  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);

  const index = Math.abs(hash) % test.variants.length;
  return test.variants[index];
}

export function recordImpression(test: ABTest, variantId: string): ABTest {
  return {
    ...test,
    variants: test.variants.map((v) =>
      v.id === variantId ? { ...v, impressions: v.impressions + 1 } : v
    ),
  };
}

export function recordConversion(test: ABTest, variantId: string): ABTest {
  return {
    ...test,
    variants: test.variants.map((v) =>
      v.id === variantId ? { ...v, conversions: v.conversions + 1 } : v
    ),
  };
}

export function calculateWinner(test: ABTest): string | null {
  const variantsWithConversions = test.variants.filter((v) => v.impressions > 0);
  if (variantsWithConversions.length === 0) return null;

  const withRates = variantsWithConversions.map((v) => ({
    ...v,
    rate: v.conversions / v.impressions,
  }));

  const winner = withRates.reduce((best, current) =>
    current.rate > best.rate ? current : best
  );

  return winner.id;
}

export function getConversionRate(variant: ABTestVariant): number {
  if (variant.impressions === 0) return 0;
  return (variant.conversions / variant.impressions) * 100;
}
