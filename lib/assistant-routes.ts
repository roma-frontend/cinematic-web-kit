// Client-safe route allow-lists for the Studio Assistant (NO 'server-only', so
// both the server prompt builder and the client hook can import it). Routes are
// gated by role; pages still enforce their own auth (defense in depth).

export type AssistantRole = 'customer' | 'admin' | 'superadmin';

const CUSTOMER_ROUTES = [
  '/dashboard',
  '/dashboard/sites',
  '/dashboard/submissions',
  '/dashboard/account',
  '/dashboard/billing',
  '/studio/builder',
  '/presets',
  '/themes',
  '/vitals',
];
const ADMIN_ROUTES = [
  ...CUSTOMER_ROUTES,
  '/dashboard/staff',
  '/dashboard/users',
  '/dashboard/all-sites',
  '/dashboard/audit',
];
const SUPERADMIN_ROUTES = [
  ...ADMIN_ROUTES,
  '/dashboard/super',
  '/dashboard/organizations',
  '/dashboard/database',
  '/dashboard/access',
  '/dashboard/activity',
  '/dashboard/trash',
  '/dashboard/control',
  '/dashboard/billing-admin',
  '/studio',
];

const ROUTES_BY_ROLE: Record<AssistantRole, string[]> = {
  customer: CUSTOMER_ROUTES,
  admin: ADMIN_ROUTES,
  superadmin: SUPERADMIN_ROUTES,
};

/** Routes the assistant may navigate a given role to. */
export function assistantRoutesForRole(role: AssistantRole): string[] {
  return ROUTES_BY_ROLE[role] ?? CUSTOMER_ROUTES;
}

/** Union of every navigable route (client-side validation of NAVIGATE tags). */
export const ASSISTANT_ROUTES = SUPERADMIN_ROUTES;

// ── Data the assistant can FETCH and render inline (role-gated) ──────────────
export type AssistantDataKey = 'my-sites' | 'users' | 'all-sites';

const DATA_BY_ROLE: Record<AssistantRole, AssistantDataKey[]> = {
  customer: ['my-sites'],
  admin: ['my-sites', 'users', 'all-sites'],
  superadmin: ['my-sites', 'users', 'all-sites'],
};

/** Data sets the assistant may fetch & display for a given role. */
export function assistantDataForRole(role: AssistantRole): AssistantDataKey[] {
  return DATA_BY_ROLE[role] ?? DATA_BY_ROLE.customer;
}

/** Union of every fetchable data key (client-side validation of DATA tags). */
export const ASSISTANT_DATA_KEYS: AssistantDataKey[] = ['my-sites', 'users', 'all-sites'];
