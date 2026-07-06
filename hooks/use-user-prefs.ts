'use client';

// Client store for DB-backed per-user UI preferences (/api/prefs). One shared
// module-level cache: the first usePref() mount fetches the whole prefs object,
// every setPref() updates the cache optimistically and debounce-PATCHes the
// server, so preferences follow the account across browsers. For signed-out
// visitors the store degrades to in-memory state (PATCH just 401s silently).

import { useCallback, useSyncExternalStore } from 'react';

export type PrefValue = string | number | boolean | string[] | Record<string, unknown>;
export type Prefs = Record<string, PrefValue>;

let cache: Prefs | null = null; // null = not fetched yet
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

let pending: Record<string, PrefValue | null> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY_MS = 800;

function notify() {
  for (const fn of listeners) fn();
}

function ensureLoaded(): void {
  if (cache !== null || loadPromise || typeof window === 'undefined') return;
  loadPromise = fetch('/api/prefs')
    .then((r) => (r.ok ? r.json() : { prefs: {} }))
    .then((data) => {
      // Keys changed locally while the fetch was in flight win over the snapshot.
      const next: Prefs = { ...(data?.prefs ?? {}), ...Object.fromEntries(Object.entries(pending).filter(([, v]) => v !== null)) };
      for (const k of Object.keys(pending)) if (pending[k] === null) delete next[k];
      cache = next;
      notify();
    })
    .catch(() => {
      cache = {};
      notify();
    });
}

function flush(keepalive = false): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const patch = pending;
  pending = {};
  if (!Object.keys(patch).length) return;
  fetch('/api/prefs', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
    keepalive,
  }).catch(() => {});
}

// Don't lose the last debounce window when the tab closes or is backgrounded.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
}

/** Update one preference: optimistic local state + debounced server PATCH. `null` deletes. */
export function setPref(key: string, value: PrefValue | null): void {
  cache = { ...(cache ?? {}) };
  if (value === null) delete cache[key];
  else cache[key] = value;
  notify();

  pending[key] = value;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  ensureLoaded();
  return () => listeners.delete(fn);
}

/** The whole prefs object (null until the first fetch resolves). */
export function usePrefs(): Prefs | null {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => null,
  );
}

/**
 * One DB-backed preference. Returns the fallback until the server snapshot
 * arrives (and for signed-out visitors), then the stored value. The setter is
 * optimistic — the UI updates instantly, the PATCH is debounced.
 */
export function usePref<T extends PrefValue>(key: string, fallback: T): [T, (v: T) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => (cache && key in cache ? cache[key] : undefined),
    () => undefined,
  );
  const set = useCallback((v: T) => setPref(key, v), [key]);
  return [(stored === undefined ? fallback : stored) as T, set];
}
