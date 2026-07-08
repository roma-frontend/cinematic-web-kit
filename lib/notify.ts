// Telegram notifications for platform (superadmin) events. Optional: every
// function is a fire-and-forget no-op unless the integration is configured in
// the Control Center (or via TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars).
// A Telegram outage must never slow down or break the operation that triggered
// the notification — sends are best-effort and never throw.
//
// Message CONTENT is localized to the superadmin's saved notification locale
// (getNotifyLocale) via lib/notify-dict. Style: HTML parse_mode, an emoji
// header, a ━ separator rule, "<b>Label:</b> value" rows, and a footer link
// back into the dashboard.

import 'server-only';
import {
  notifyTelegram,
  esc,
  dashUrl,
  getNotifyLocale,
  type TelegramCategory,
} from '@/lib/telegram';
import { notifyDict, type NotifyDict } from '@/lib/notify-dict';

const RULE = '━━━━━━━━━━━━━━━━━━';

/** When we render a timestamp, use a compact, locale-stable format. */
function now(): string {
  return new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

/** A "Label" row; skipped entirely when the value is empty. */
function row(label: string, value: unknown): string | null {
  const v = String(value ?? '').trim();
  return v ? `<b>${label}:</b> ${esc(v)}` : null;
}

/** A monospace row (ids, slugs, order numbers). */
function codeRow(label: string, value: unknown): string | null {
  const v = String(value ?? '').trim();
  return v ? `<b>${label}:</b> <code>${esc(v)}</code>` : null;
}

/**
 * Assemble a polished HTML message: header + rule + rows + rule + footer link.
 * `rows` may contain nulls (dropped) so callers can conditionally include lines.
 */
function build(header: string, rows: (string | null)[], footer?: { label: string; path: string }): string {
  const body = rows.filter((r): r is string => Boolean(r));
  const lines = [`<b>${header}</b>`, RULE, ...body, RULE, `🕐 ${now()}`];
  if (footer) lines.push('', `<a href="${dashUrl(footer.path)}">${footer.label}</a>`);
  return lines.join('\n');
}

/** Resolve the message dictionary for the owner's saved notification locale. */
function d(): NotifyDict {
  return notifyDict(getNotifyLocale());
}

// ---------------------------------------------------------------------------
// Critical security alerts (gated by the 'security' category).
// ---------------------------------------------------------------------------

/** Page the admin chat for a critical audit event (no-op if not critical). */
export function notifyCritical(action: string, actorEmail: string, target: string, detail: string): void {
  const t = d();
  const title = t.criticalActions[action];
  if (!title) return;
  notifyTelegram('security', build(
    `🔐 ${title}`,
    [row(t.labels.who, actorEmail), row(t.labels.object, target), row(t.labels.details, detail), codeRow(t.labels.action, action)],
    { label: t.footers.control, path: '/dashboard/control' },
  ));
}

// ---------------------------------------------------------------------------
// Platform event notifications.
// ---------------------------------------------------------------------------

/** A new platform account was created. */
export function notifyRegistration(user: { name?: string; email: string; role?: string }): void {
  const t = d();
  notifyTelegram('registrations', build(
    t.headers.registration,
    [row(t.labels.name, user.name || '—'), row(t.labels.email, user.email), row(t.labels.role, user.role)],
    { label: t.footers.users, path: '/dashboard/users' },
  ));
}

/** A site went live (published). */
export function notifySitePublished(site: { name: string; slug: string; ownerEmail?: string }): void {
  const t = d();
  notifyTelegram('publishes', build(
    t.headers.sitePublished,
    [row(t.labels.title, site.name), codeRow(t.labels.address, site.slug), row(t.labels.owner, site.ownerEmail)],
    { label: t.footers.allSites, path: '/dashboard/all-sites' },
  ));
}

/** A visitor submitted a form (lead / contact). */
export function notifySubmission(input: { siteName?: string; formId?: string; fields?: Record<string, unknown> }): void {
  const t = d();
  const previewKeys = ['Name', 'Email', 'Phone', 'Message', 'Subject'] as const;
  const fields = input.fields || {};
  const rows = previewKeys
    .filter((k) => fields[k.toLowerCase()] != null && String(fields[k.toLowerCase()]).trim())
    .slice(0, 5)
    .map((k) => row(t.labels[k], fields[k.toLowerCase()]));
  notifyTelegram('submissions', build(
    t.headers.submission,
    [row(t.labels.site, input.siteName), codeRow(t.labels.form, input.formId), ...rows],
    { label: t.footers.submissions, path: '/dashboard/submissions' },
  ));
}

/** A user requested to create / join an organization. */
export function notifyOrgRequest(req: { type?: string; requesterEmail?: string; requesterName?: string; requestedName?: string; message?: string }): void {
  const t = d();
  const typeLabel = req.type === 'join' ? t.orgType.join : t.orgType.create;
  notifyTelegram('orgRequests', build(
    t.headers.orgRequest,
    [row(t.labels.type, typeLabel), row(t.labels.from, req.requesterName || req.requesterEmail), row(t.labels.org, req.requestedName), row(t.labels.message, req.message)],
    { label: t.footers.organizations, path: '/dashboard/organizations' },
  ));
}

/** A subscription was created or changed (billing). */
export function notifySubscription(sub: { userEmail?: string; planName: string; interval?: string; amount?: string; status?: string }): void {
  const t = d();
  const status = sub.status === 'trial' ? t.subStatus.trial : sub.status === 'active' ? t.subStatus.active : sub.status;
  notifyTelegram('subscriptions', build(
    t.headers.subscription,
    [row(t.labels.client, sub.userEmail), row(t.labels.plan, sub.planName), row(t.labels.period, sub.interval), row(t.labels.amount, sub.amount), row(t.labels.status, status)],
    { label: t.footers.billing, path: '/dashboard/billing-admin' },
  ));
}

/** A support ticket was opened on a tenant site. */
export function notifyTicket(ticket: { siteName?: string; subject: string; authorEmail?: string }): void {
  const t = d();
  notifyTelegram('tickets', build(
    t.headers.ticket,
    [row(t.labels.site, ticket.siteName), row(t.labels.subject, ticket.subject || t.noSubject), row(t.labels.author, ticket.authorEmail)],
    { label: t.footers.allSites, path: '/dashboard/all-sites' },
  ));
}

/** Re-export for callers that want to gate work on a category. */
export type { TelegramCategory };
