'use client';

/**
 * useRealtimeSync
 *
 * Establishes a Socket.IO connection to the backend and routes incoming
 * real-time events to the appropriate local state sinks:
 *
 *   • React Query  → queryClient.invalidateQueries()
 *   • Cart context → BroadcastChannel-style refresh via CartContext
 *   • DOM events   → DATA_CHANGED_EVENT so non-RQ admin pages pick it up
 *                    via their useSyncRefetch() hook
 *
 * Runs only when the user is authenticated (token present).
 * Cleans up the socket on unmount / logout.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { DATA_CHANGED_EVENT } from '@/components/providers/CrossTabSyncProvider';

const ACCESS_TOKEN_KEY = 'shielder_access_token';

type RealtimeEvent =
  | 'cart:updated'
  | 'order:created'
  | 'order:updated'
  | 'profile:updated'
  | 'quotation:created'
  | 'quotation:updated'
  | 'product:created'
  | 'product:updated'
  | 'product:deleted'
  | 'category:created'
  | 'category:updated'
  | 'category:deleted'
  | 'subcategory:created'
  | 'subcategory:updated'
  | 'subcategory:deleted'
  | 'notification:new'
  | 'settings:updated'
  | 'privacy-policy:updated';

// Maps a socket event to React Query keys that should be invalidated
const EVENT_QUERY_MAP: Partial<Record<RealtimeEvent, string[]>> = {
  'cart:updated':       ['cart'],
  'order:created':      ['orders', 'my-orders', 'order-summary'],
  'order:updated':      ['orders', 'my-orders', 'order-summary'],
  'profile:updated':    ['profile'],
  'quotation:created':  ['quotations', 'customer-quotations'],
  'quotation:updated':  ['quotations', 'customer-quotations'],
  'product:created':    ['products'],
  'product:updated':    ['products'],
  'product:deleted':    ['products'],
  'category:created':   ['categories'],
  'category:updated':   ['categories'],
  'category:deleted':   ['categories'],
  'subcategory:created':['subcategories'],
  'subcategory:updated':['subcategories'],
  'subcategory:deleted':['subcategories'],
  'notification:new':   ['notifications'],
  'settings:updated':   ['settings'],
  'privacy-policy:updated': ['privacy-policy'],
};

// Maps a socket event to the DATA_CHANGED module name (for non-RQ admin pages)
const EVENT_MODULE_MAP: Partial<Record<RealtimeEvent, string>> = {
  'order:created':      'orders',
  'order:updated':      'orders',
  'quotation:created':  'quotations',
  'quotation:updated':  'quotations',
  'product:created':    'products',
  'product:updated':    'products',
  'product:deleted':    'products',
  'category:created':   'categories',
  'category:updated':   'categories',
  'category:deleted':   'categories',
  'subcategory:created':'subcategories',
  'subcategory:updated':'subcategories',
  'subcategory:deleted':'subcategories',
};

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClientRef = useRef(queryClient);
  useEffect(() => { queryClientRef.current = queryClient; });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    const socket = getSocket(token);

    const handleEvent = (event: RealtimeEvent) => (_data: unknown) => {
      // 1. Invalidate React Query keys
      const keys = EVENT_QUERY_MAP[event];
      if (keys) {
        keys.forEach((key) =>
          queryClientRef.current.invalidateQueries({ queryKey: [key] }),
        );
      }

      // 2. Dispatch DOM event for non-RQ admin pages
      const module = EVENT_MODULE_MAP[event];
      if (module) {
        window.dispatchEvent(
          new CustomEvent(DATA_CHANGED_EVENT, { detail: { module } }),
        );
      }
    };

    const events = Object.keys(EVENT_QUERY_MAP) as RealtimeEvent[];
    events.forEach((event) => socket.on(event, handleEvent(event)));

    socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[socket] connected', socket.id);
      }
    });

    socket.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[socket] disconnected', reason);
      }
    });

    socket.on('connect_error', (err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[socket] connect_error', err.message);
      }
    });

    return () => {
      events.forEach((event) => socket.off(event));
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [isAuthenticated]);
}
