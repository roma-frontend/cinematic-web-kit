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
  } catch {
    /* best-effort */
  }
}

/** Subscribe to submission events. Returns an unsubscribe function. */
export function onSubmission(handler: (evt: SubmissionEvent) => void): () => void {
  bus.on(EVENT, handler);
  return () => bus.off(EVENT, handler);
}
