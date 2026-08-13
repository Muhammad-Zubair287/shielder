'use client';

/**
 * Clears the cart once after EPG success redirect (idempotent across refresh / StrictMode).
 */

import { useEffect, useRef } from 'react';

type Options = {
  orderId: string | undefined;
  enabled: boolean;
  clearCart: (options?: { silent?: boolean }) => Promise<void>;
};

const claimedClears = new Set<string>();

export function useEpgCartClearOnce({ orderId, enabled, clearCart }: Options): void {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !orderId || startedRef.current) return;

    const key = `shielder:epg-cart-cleared:${orderId}`;
    if (claimedClears.has(key)) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
      claimedClears.add(key);
      return;
    }

    startedRef.current = true;
    claimedClears.add(key);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, '1');
    }

    // Always silent — payment success UI already communicates outcome.
    clearCart({ silent: true }).catch(() => {});
  }, [enabled, orderId, clearCart]);
}
