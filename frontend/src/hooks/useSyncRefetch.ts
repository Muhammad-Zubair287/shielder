'use client';

/**
 * useSyncRefetch
 * ─────────────────────────────────────────────────────────────────────────────
 * Listens for the DATA_CHANGED_EVENT custom DOM event dispatched by
 * CrossTabSyncProvider when another tab mutates data.
 *
 * Usage — add one line inside any page/component that manually fetches data:
 *
 *   useSyncRefetch(fetchData);
 *   useSyncRefetch(fetchData, 'products');  // only react to 'products' module
 *
 * The hook is a no-op on the server (SSR-safe).
 */

import { useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT } from '@/components/providers/CrossTabSyncProvider';

export function useSyncRefetch(
  fetchFn: () => void,
  /** Optional — only refetch when the event module matches this string */
  module?: string,
): void {
  const fetchRef = useRef(fetchFn);
  useEffect(() => { fetchRef.current = fetchFn; });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      if (module) {
        const detail = (e as CustomEvent<{ module: string }>).detail;
        if (detail?.module && detail.module !== module) return;
      }
      fetchRef.current();
    };

    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, [module]);
}
