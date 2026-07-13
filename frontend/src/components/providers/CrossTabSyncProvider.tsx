'use client';

/**
 * CrossTabSyncProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * Listens on BroadcastChannel('shielder:sync') and reacts to events from other
 * browser tabs:
 *
 *  AUTH_LOGOUT          → log this tab out immediately
 *  AUTH_USER_UPDATED    → update Zustand auth store with new user object
 *  LANGUAGE_CHANGED     → switch locale in LanguageContext
 *  QUERY_INVALIDATE     → invalidate specific React Query keys
 *  QUERY_INVALIDATE_ALL → invalidate every React Query key
 *  DATA_CHANGED         → dispatch a DOM custom event so non-RQ admin pages
 *                         can opt in to refetch via useSyncRefetch hook
 *
 * Must be mounted INSIDE:
 *   - QueryProvider   (needs useQueryClient)
 *   - LanguageProvider (needs useLanguage)
 *
 * Does NOT re-act to events it itself broadcasts (BroadcastChannel does not
 * echo messages back to the sender).
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { SYNC_CHANNEL, type SyncEvent } from '@/lib/crossTabSync';
import type { Locale } from '@/contexts/LanguageContext';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export const DATA_CHANGED_EVENT = 'shielder:data-changed';

export function CrossTabSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient  = useQueryClient();
  const { setLocale } = useLanguage();

  // Real-time cross-platform sync (Web + Android + iOS via Socket.IO)
  useRealtimeSync();

  // Use refs for Zustand actions so the effect dependency stays stable
  const setUserRef  = useRef(useAuthStore.getState().setUser);
  const logoutRef   = useRef(useAuthStore.getState().logout);

  useEffect(() => {
    setUserRef.current  = useAuthStore.getState().setUser;
    logoutRef.current   = useAuthStore.getState().logout;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL);
    } catch {
      return; // BroadcastChannel not supported
    }

    channel.onmessage = (e: MessageEvent<SyncEvent>) => {
      const event = e.data;
      if (!event?.type) return;

      switch (event.type) {
        case 'AUTH_LOGOUT':
          // Another tab logged out — clear auth state on this tab too
          logoutRef.current();
          break;

        case 'AUTH_USER_UPDATED':
          // Another tab saved a profile change — reflect it here without an API call
          if (event.user) {
            setUserRef.current(event.user as any);
          }
          break;

        case 'LANGUAGE_CHANGED':
          setLocale(event.locale as Locale);
          break;

        case 'QUERY_INVALIDATE':
          // Invalidate specific query keys
          event.keys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
          break;

        case 'QUERY_INVALIDATE_ALL':
          queryClient.invalidateQueries();
          break;

        case 'DATA_CHANGED':
          // Non-React-Query pages subscribe to this DOM event via useSyncRefetch()
          window.dispatchEvent(
            new CustomEvent(DATA_CHANGED_EVENT, { detail: { module: event.module } }),
          );
          break;
      }
    };

    return () => {
      channel.close();
    };
  }, [queryClient, setLocale]);

  return <>{children}</>;
}
