// Payment provider — Stripe over its REST API using plain `fetch` (no SDK, in
// keeping with this project's zero-dependency, self-hostable ethos). When no
// STRIPE_SECRET_KEY is configured the provider runs in "manual" mode: checkout
// resolves to an internal confirmation page the superadmin/user can complete by
// hand, so the whole billing flow is exercisable locally with zero config
// (mirroring how email/R2/muapi degrade gracefully elsewhere).

import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PLANS, type BillingInterval, type PlanId } from '@/lib/billing/plans';

const STRIPE_API = 'https://api.stripe.com/v1';

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export type ProviderMode = 'stripe' | 'manual';
export function providerMode(): ProviderMode {
  return stripeConfigured() ? 'stripe' : 'manual';
}

function appHost(): string {
  const host = process.env.NEXT_PUBLIC_APP_HOST || 'localhost:3000';
  const scheme = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${scheme}://${host}`;
}

/** Encode a nested object into application/x-www-form-urlencoded (Stripe's
 *  bracket syntax, e.g. line_items[0][price_data][currency]). */
function encodeForm(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      parts.push(encodeForm(value as Record<string, unknown>, k));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object') parts.push(encodeForm(v as Record<string, unknown>, `${k}[${i}]`));
        else parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(String(v))}`);
      });
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join('&');
}

async function stripeFetch<T = unknown>(path: string, body?: Record<string, unknown>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY!;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? encodeForm(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message || `Stripe ${res.status}`);
  return json;
}

export interface CheckoutResult {
  /** URL to redirect the buyer to. In manual mode this is an internal path. */
  url: string;
  mode: ProviderMode;
  /** In manual mode, the plan/interval so the internal page can complete it. */
  planId: PlanId;
  interval: BillingInterval;
}

/** Create a subscription checkout. Stripe Checkout Session when configured,
 *  else an internal manual-confirm URL. */
export async function createCheckout(opts: {
  userId: string;
  email: string;
  planId: PlanId;
  interval: BillingInterval;
}): Promise<CheckoutResult> {
  const plan = PLANS[opts.planId];
  const amount = plan.price[opts.interval];
  const base = appHost();

  if (!stripeConfigured()) {
    // Manual mode: hand off to an internal confirmation route.
    const url = `/checkout/${opts.planId}/confirm?interval=${opts.interval}`;
    return { url, mode: 'manual', planId: opts.planId, interval: opts.interval };
  }

  const session = await stripeFetch<{ id: string; url: string }>('/checkout/sessions', {
    mode: 'subscription',
    success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/billing/cancel`,
    customer_email: opts.email,
    client_reference_id: opts.userId,
    'metadata[userId]': opts.userId,
    'metadata[planId]': opts.planId,
    'metadata[interval]': opts.interval,
    'line_items': [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: amount,
          recurring: { interval: opts.interval },
          product_data: { name: `Builder Studio — ${plan.id}` },
        },
      },
    ],
    'subscription_data': { 'metadata[userId]': opts.userId, 'metadata[planId]': opts.planId },
  });

  return { url: session.url, mode: 'stripe', planId: opts.planId, interval: opts.interval };
}

/** Cancel a Stripe subscription (at period end). No-op in manual mode. */
export async function cancelStripeSubscription(providerSubId: string, atPeriodEnd = true): Promise<void> {
  if (!stripeConfigured() || !providerSubId) return;
  if (atPeriodEnd) {
    await stripeFetch(`/subscriptions/${providerSubId}`, { cancel_at_period_end: 'true' });
  } else {
    await fetch(`${STRIPE_API}/subscriptions/${providerSubId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
  }
}

/** Create a Stripe Billing Portal session so the customer can self-manage. */
export async function createPortalSession(providerCustomerId: string): Promise<string | null> {
  if (!stripeConfigured() || !providerCustomerId) return null;
  const session = await stripeFetch<{ url: string }>('/billing_portal/sessions', {
    customer: providerCustomerId,
    return_url: `${appHost()}/dashboard/billing`,
  });
  return session.url;
}

// ─────────────────────────── Webhook verification ───────────────────────────

/**
 * Verify a Stripe webhook signature (t=…,v1=… scheme) using HMAC-SHA256 with
 * the endpoint secret — no SDK needed. Returns true when a v1 signature matches
 * within the tolerance window (default 5 min, replay protection).
 */
export function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSec = 300,
  now = Date.now(),
): boolean {
  if (!payload || !sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k.trim(), (v ?? '').trim()];
    }),
  );
  const t = Number(parts['t']);
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  // Replay window.
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
