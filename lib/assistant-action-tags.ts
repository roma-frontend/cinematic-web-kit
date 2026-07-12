// Client-safe parsing / metadata for agentic <ACTION> tags emitted by the
// Studio Assistant. The heavy mutation layer lives in the server-only
// lib/assistant-actions.ts; this module is imported by both the client parser
// and by the server mutation module so tag semantics stay in one place.

import type { Locale } from '@/lib/seo';
import type { AssistantRole } from '@/lib/assistant-routes';

export type AgentAction =
  | { kind: 'create_site'; name: string; locale?: Locale }
  | { kind: 'publish_site'; siteId: string }
  | { kind: 'invite_site_user'; siteId: string; email: string; name?: string };

export interface PendingAction {
  action: AgentAction;
  /** Human summary shown in the confirmation dialog. */
  summary: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  redirect?: string;
}

// Role allow-lists. Customers may only act on their own resources; staff can
// act on any resource they can manage through the dashboard.
const ACTION_ROLES: Record<AgentAction['kind'], AssistantRole[]> = {
  create_site: ['customer', 'admin', 'superadmin'],
  publish_site: ['customer', 'admin', 'superadmin'],
  invite_site_user: ['customer', 'admin', 'superadmin'],
};

export function actionRoles(kind: AgentAction['kind']): AssistantRole[] {
  return ACTION_ROLES[kind];
}

export function canProposeAction(role: AssistantRole, kind: AgentAction['kind']): boolean {
  return ACTION_ROLES[kind].includes(role);
}

function getText(el: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>\\s*([^<]*?)\\s*</${tag}>`, 'i').exec(el);
  return (m?.[1] ?? '').trim();
}

function getAttr(el: string, name: string): string {
  const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(el);
  return (m?.[1] ?? '').trim();
}

/**
 * Parse the first well-formed <ACTION> block from a model reply. Supports both
 * block form (<ACTION>...</ACTION>) and self-closing form (<ACTION kind="x"
 * name="y" />). Only one action per reply is allowed to keep the UX simple and
 * deterministic. Returns null if the block is malformed or the kind is unknown.
 */
export function parseActionTag(raw: string): AgentAction | null {
  const block = /<ACTION\b([^>]*)>([\s\S]*?)<\/ACTION>/i.exec(raw);
  const self = !block ? /<ACTION\b([^>]*)\/>/i.exec(raw) : null;
  if (!block && !self) return null;
  const m = (block ?? self)!;
  const el = m[0];
  const body = block ? (m[2] ?? '') : '';
  const kindAttr = getAttr(el, 'kind');
  const kind = (kindAttr || getText(body, 'kind')).toLowerCase();

  if (kind === 'create_site') {
    const name = getAttr(el, 'name') || getText(body, 'name');
    const locale = getAttr(el, 'locale') || getText(body, 'locale');
    if (!name) return null;
    const parsed = locale.toLowerCase();
    return {
      kind: 'create_site',
      name,
      locale: parsed === 'ru' || parsed === 'en' || parsed === 'hy' ? (parsed as Locale) : undefined,
    };
  }
  if (kind === 'publish_site') {
    const siteId = getAttr(el, 'siteId') || getAttr(el, 'site_id') || getText(body, 'siteId') || getText(body, 'site_id');
    if (!siteId) return null;
    return { kind: 'publish_site', siteId };
  }
  if (kind === 'invite_site_user' || kind === 'invite_member') {
    const siteId = getAttr(el, 'siteId') || getAttr(el, 'site_id') || getText(body, 'siteId') || getText(body, 'site_id');
    const email = getAttr(el, 'email') || getText(body, 'email');
    const name = getAttr(el, 'name') || getText(body, 'name') || undefined;
    if (!siteId || !email || !email.includes('@')) return null;
    return { kind: 'invite_site_user', siteId, email, name };
  }
  return null;
}

/** Strip every <ACTION> block (and any dangling partial tag) from a reply. */
export function stripActionTags(raw: string): string {
  return raw
    .replace(/<ACTION\b[^>]*>[\s\S]*?<\/ACTION>/gi, '') // block form with attrs
    .replace(/<ACTION\b[^>]*\/>/gi, '')                    // self-closing form
    .replace(/<ACTION\b[^>]*>/gi, '')                       // opening only
    .replace(/<ACTION[\s\S]*$/i, '')                       // dangling start
    .replace(/<\/ACTION>\s*/gi, '')                        // orphaned closer
    .trim();
}

/** Build a one-line localized summary of what the action will do. */
export function summarizeAction(action: AgentAction, locale: Locale): string {
  switch (action.kind) {
    case 'create_site':
      if (locale === 'ru') return `Создать сайт «${action.name}»`;
      if (locale === 'hy') return `Ստեղծել «${action.name}» կայքը`;
      return `Create site “${action.name}”`;
    case 'publish_site':
      if (locale === 'ru') return 'Опубликовать сайт';
      if (locale === 'hy') return 'Հրապարակել կայքը';
      return 'Publish site';
    case 'invite_site_user':
      if (locale === 'ru') return `Пригласить ${action.email}${action.name ? ` (${action.name})` : ''}`;
      if (locale === 'hy') return `Հրավիրել ${action.email}${action.name ? ` (${action.name})` : ''}`;
      return `Invite ${action.email}${action.name ? ` (${action.name})` : ''}`;
  }
}
