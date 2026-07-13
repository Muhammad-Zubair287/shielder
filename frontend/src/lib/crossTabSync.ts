/**
 * crossTabSync
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed BroadcastChannel wrapper for cross-tab state synchronization.
 *
 * Each tab listens on 'shielder:sync'. When any tab mutates shared state it
 * calls broadcastSync() — other tabs react via CrossTabSyncProvider.
 *
 * Sending: opens a channel, posts the event, closes immediately.
 * Receiving: handled by CrossTabSyncProvider (keeps the channel open).
 */

export type SyncEvent =
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_USER_UPDATED'; user: unknown }
  | { type: 'LANGUAGE_CHANGED'; locale: 'en' | 'ar' }
  | { type: 'QUERY_INVALIDATE'; keys: string[] }
  | { type: 'QUERY_INVALIDATE_ALL' }
  | { type: 'DATA_CHANGED'; module: string };

export const SYNC_CHANNEL = 'shielder:sync';

/**
 * Broadcast a sync event to all other open tabs.
 * SSR-safe: no-ops on the server.
 * Swallows errors silently so callers never crash.
 */
export function broadcastSync(event: SyncEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const ch = new BroadcastChannel(SYNC_CHANNEL);
    ch.postMessage(event);
    ch.close();
  } catch {
    // BroadcastChannel not supported or blocked — silent fallback
  }
}
