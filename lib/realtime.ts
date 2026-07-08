import 'server-only';
import { EventEmitter } from 'node:events';

// Lightweight in-process pub/sub for real-time updates (Server-Sent Events).
// Zero dependencies, zero external service — great for the free tier. New form
// submissions are published here and streamed to the owner's dashboard live.
//
// Scope note: this is per-process. On a single Fly machine it broadcasts to all
// connected dashboard tabs. If you later scale to multiple instances, swap this
// module for a shared bus (Redis pub/sub, Ably, Durable Objects) — the public
// API (publishSubmission / onSubmission) can stay identical.

export interface SubmissionEvent {
  siteId: string;
  siteName?: string;
  formId: string;
  at: string; // ISO timestamp
}

// Survive Next.js dev HMR by stashing the emitter on globalThis.
const g = globalThis as unknown as { __rtBus?: EventEmitter };
const bus = (g.__rtBus ??= new EventEmitter());
// Many dashboard tabs may subscribe at once; lift the default 10-listener cap.
bus.setMaxListeners(0);

const EVENT = 'submission';

/** Broadcast a new submission to all subscribers. Never throws. */
export function publishSubmission(evt: SubmissionEvent): void {
  try {
    bus.emit(EVENT, evt);
    // Also fan out to the unified notification channel (header bell).
    publishNotify({ kind: 'submission', siteId: evt.siteId, at: evt.at });
  } catch {
    /* best-effort */
  }
}

/** Subscribe to submission events. Returns an unsubscribe function. */
export function onSubmission(handler: (evt: SubmissionEvent) => void): () => void {
  bus.on(EVENT, handler);
  return () => bus.off(EVENT, handler);
}

// ── Unified notification channel ────────────────────────────────────────────
// Every dashboard-relevant event (new form lead, a pending member join request,
// a new organization request) is published here so the header notification bell
// can show one aggregated, live, blinking + chiming counter. Events are routed
// either to a site owner (via siteId → the stream resolves owned sites) or to
// all superadmins (superadmin: true).

export type NotifyKind = 'submission' | 'member-request' | 'org-request';

export interface NotifyEvent {
  kind: NotifyKind;
  /** Owner-scoped events carry the site id; the stream forwards it only to the
   *  site's owner. */
  siteId?: string;
  /** Platform-wide events (e.g. a new org request) go to every superadmin. */
  superadmin?: boolean;
  at: string; // ISO timestamp
}

const NOTIFY = 'notify';

/** Broadcast a dashboard notification to all subscribers. Never throws. */
export function publishNotify(evt: NotifyEvent): void {
  try {
    bus.emit(NOTIFY, evt);
  } catch {
    /* best-effort */
  }
}

/** Subscribe to unified notification events. Returns an unsubscribe function. */
export function onNotify(handler: (evt: NotifyEvent) => void): () => void {
  bus.on(NOTIFY, handler);
  return () => bus.off(NOTIFY, handler);
}
