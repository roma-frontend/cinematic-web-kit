'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * false during SSR/hydration, true right after mount. The store-based version
 * of the classic `mounted` flag — no setState-in-effect render cascade.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
