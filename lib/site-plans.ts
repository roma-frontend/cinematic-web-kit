import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, newId, sites, sitePlans, type SitePlan } from '@/lib/db';
import type { BuilderDoc, BuilderNode } from '@/lib/builder/types';

// Per-org member plan CATALOG. An org admin creates/edits plans for THEIR site;
// members subscribe through the platform Stripe account using inline price_data
// from these local rows. Admins never connect Stripe or manage provider objects.
// All writes are siteId-scoped (ownership enforced at the API layer).

export type PlanInterval = 'month' | 'year';

export interface PlanInput {
  name: string;
  description?: string;
  amountCents: number;
  currency?: string;
  interval?: PlanInterval;
  perks?: string[];
  active?: boolean;
  sortOrder?: number;
}

/** Serializable plan for the client (perks parsed from JSON). */
export interface PlanDTO {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  interval: PlanInterval;
  perks: string[];
  active: boolean;
  sortOrder: number;
  /** Legacy UI flag: provider objects are created at checkout, not during plan edits. */
  synced: boolean;
}

const builderPlanPrefix = (siteId: string) => `bplan_${siteId.replace(/[^a-zA-Z0-9_-]/g, '_')}_`;
const builderPlanId = (siteId: string, nodeId: string) => `${builderPlanPrefix(siteId)}${nodeId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;

function parsePerks(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20) : [];
  } catch {
    return [];
  }
}

function toDTO(p: SitePlan): PlanDTO {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    amountCents: p.amountCents,
    currency: p.currency,
    interval: (p.interval === 'year' ? 'year' : 'month'),
    perks: parsePerks(p.perks),
    active: p.active,
    sortOrder: p.sortOrder,
    synced: false,
  };
}

const clampPerks = (perks?: string[]): string =>
  JSON.stringify((perks ?? []).map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 20));

const normInterval = (v?: string): PlanInterval => (v === 'year' ? 'year' : 'month');

function parseDoc(json: string | null): BuilderDoc | null {
  if (!json) return null;
  try {
    const doc = JSON.parse(json);
    return doc && Array.isArray(doc.pages) ? doc as BuilderDoc : null;
  } catch {
    return null;
  }
}

const lines = (s?: string): string[] => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

function priceFromBuilder(price: string): { amountCents: number; currency: string } | null {
  const raw = price.trim();
  const currency =
    /₽|руб|rub/i.test(raw) ? 'rub'
    : /\$|usd/i.test(raw) ? 'usd'
    : /€|eur/i.test(raw) ? 'eur'
    : /֏|amd/i.test(raw) ? 'amd'
    : 'usd';
  const n = Number(raw.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return { amountCents: Math.round(n * 100), currency };
}

function intervalFromBuilder(period: string): PlanInterval {
  return /год|year|yr|ann/i.test(period) ? 'year' : 'month';
}

function pricingNodes(doc: BuilderDoc): BuilderNode[] {
  const out: BuilderNode[] = [];
  const walk = (nodes: BuilderNode[]) => {
    for (const n of nodes) {
      if (n.type === 'pricing') out.push(n);
      if (n.children) walk(n.children);
    }
  };
  for (const p of doc.pages) walk(p.blocks);
  return out;
}

function publishedDoc(siteId: string): BuilderDoc | null {
  const row = getDb().select({ publishedDoc: sites.publishedDoc }).from(sites).where(eq(sites.id, siteId)).get();
  return parseDoc(row?.publishedDoc ?? null);
}

/** Plan ids the admin explicitly deleted — builder sync/seed must skip these. */
function suppressedPlanIds(siteId: string): Set<string> {
  const row = getDb().select({ s: sites.suppressedPlans }).from(sites).where(eq(sites.id, siteId)).get();
  try {
    const arr = JSON.parse(row?.s ?? '[]');
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Mark a plan id as deleted so builder pricing sync never resurrects it. */
function suppressPlanId(siteId: string, planId: string): void {
  const set = suppressedPlanIds(siteId);
  if (set.has(planId)) return;
  set.add(planId);
  getDb().update(sites).set({ suppressedPlans: JSON.stringify([...set]), updatedAt: new Date() }).where(eq(sites.id, siteId)).run();
}

function builderPlanRow(siteId: string, node: BuilderNode, sortOrder: number, now = new Date()): SitePlan | null {
  const money = priceFromBuilder(node.props.price ?? '');
  if (!money) return null;
  return {
    id: builderPlanId(siteId, node.id),
    siteId,
    name: (node.props.plan || 'Plan').slice(0, 120),
    description: '',
    amountCents: money.amountCents,
    currency: money.currency,
    interval: intervalFromBuilder(node.props.period ?? ''),
    perks: clampPerks(lines(node.props.features)),
    active: true,
    sortOrder,
    stripeProductId: null,
    stripePriceId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function ensureBuilderPlansFromPublished(siteId: string): void {
  const db = getDb();
  const hasAny = db.select({ id: sitePlans.id }).from(sitePlans).where(eq(sitePlans.siteId, siteId)).get();
  if (hasAny) return;
  const doc = publishedDoc(siteId);
  if (!doc) return;
  syncBuilderPricingPlans(siteId, doc);
}

// ── Admin CRUD ──────────────────────────────────────────────────────────────

export function listPlansForAdmin(siteId: string): PlanDTO[] {
  ensureBuilderPlansFromPublished(siteId);
  return getDb()
    .select()
    .from(sitePlans)
    .where(eq(sitePlans.siteId, siteId))
    .orderBy(asc(sitePlans.sortOrder), asc(sitePlans.createdAt))
    .all()
    .map(toDTO);
}

/** Active plans for the public landing (ordered). */
export function listActivePlans(siteId: string): PlanDTO[] {
  ensureBuilderPlansFromPublished(siteId);
  return getDb()
    .select()
    .from(sitePlans)
    .where(and(eq(sitePlans.siteId, siteId), eq(sitePlans.active, true)))
    .orderBy(asc(sitePlans.sortOrder), asc(sitePlans.createdAt))
    .all()
    .map(toDTO);
}

export function getPlan(siteId: string, planId: string): SitePlan | null {
  ensureBuilderPlansFromPublished(siteId);
  return getDb().select().from(sitePlans).where(and(eq(sitePlans.id, planId), eq(sitePlans.siteId, siteId))).get() ?? null;
}

/** Sync published builder pricing cards into the payable member-plan catalog. */
export function syncBuilderPricingPlans(siteId: string, doc: BuilderDoc): BuilderDoc {
  const db = getDb();
  const now = new Date();
  const prefix = builderPlanPrefix(siteId);
  const seen = new Set<string>();
  let sortOrder = 0;
  const suppressed = suppressedPlanIds(siteId);

  for (const node of pricingNodes(doc)) {
    const row = builderPlanRow(siteId, node, sortOrder++, now);
    if (!row) continue;
    // Admin deleted this plan — do not recreate/reactivate it from the builder.
    if (suppressed.has(row.id)) continue;
    node.props.planId = row.id;
    seen.add(row.id);
    const existing = db.select({ id: sitePlans.id }).from(sitePlans).where(and(eq(sitePlans.id, row.id), eq(sitePlans.siteId, siteId))).get();
    if (existing) {
      db.update(sitePlans)
        .set({
          name: row.name,
          description: row.description,
          amountCents: row.amountCents,
          currency: row.currency,
          interval: row.interval,
          perks: row.perks,
          active: true,
          sortOrder: row.sortOrder,
          updatedAt: now,
        })
        .where(eq(sitePlans.id, row.id))
        .run();
    } else {
      db.insert(sitePlans).values(row).run();
    }
  }

  for (const row of db.select({ id: sitePlans.id }).from(sitePlans).where(eq(sitePlans.siteId, siteId)).all()) {
    if (row.id.startsWith(prefix) && !seen.has(row.id)) {
      db.update(sitePlans).set({ active: false, updatedAt: now }).where(eq(sitePlans.id, row.id)).run();
    }
  }

  return doc;
}

export async function createPlan(siteId: string, input: PlanInput): Promise<PlanDTO> {
  const now = new Date();
  const row: SitePlan = {
    id: newId('plan'),
    siteId,
    name: input.name.slice(0, 120),
    description: (input.description ?? '').slice(0, 1000),
    amountCents: Math.max(0, Math.round(input.amountCents || 0)),
    currency: (input.currency || 'usd').toLowerCase().slice(0, 3),
    interval: normInterval(input.interval),
    perks: clampPerks(input.perks),
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    stripeProductId: null,
    stripePriceId: null,
    createdAt: now,
    updatedAt: now,
  };
  getDb().insert(sitePlans).values(row).run();
  return toDTO(getPlan(siteId, row.id) ?? row);
}

export async function updatePlan(siteId: string, planId: string, input: Partial<PlanInput>): Promise<void> {
  const existing = getPlan(siteId, planId);
  if (!existing) return;
  const set: Partial<SitePlan> = { updatedAt: new Date() };
  if (typeof input.name === 'string') set.name = input.name.slice(0, 120);
  if (typeof input.description === 'string') set.description = input.description.slice(0, 1000);
  if (typeof input.amountCents === 'number') set.amountCents = Math.max(0, Math.round(input.amountCents));
  if (typeof input.currency === 'string') set.currency = input.currency.toLowerCase().slice(0, 3);
  if (input.interval) set.interval = normInterval(input.interval);
  if (input.perks) set.perks = clampPerks(input.perks);
  if (typeof input.active === 'boolean') set.active = input.active;
  if (typeof input.sortOrder === 'number') set.sortOrder = input.sortOrder;
  getDb().update(sitePlans).set(set).where(and(eq(sitePlans.id, planId), eq(sitePlans.siteId, siteId))).run();
}

export function deletePlan(siteId: string, planId: string): void {
  // Existing member subscriptions live independently from the local catalog row.
  // If this plan was derived from a builder pricing card, record it as suppressed
  // so ensureBuilderPlansFromPublished / syncBuilderPricingPlans don't recreate it.
  if (planId.startsWith(builderPlanPrefix(siteId))) suppressPlanId(siteId, planId);
  getDb().delete(sitePlans).where(and(eq(sitePlans.id, planId), eq(sitePlans.siteId, siteId))).run();
}
