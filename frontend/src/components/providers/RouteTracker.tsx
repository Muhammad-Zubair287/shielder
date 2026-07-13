'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const KEY = 'prev_app_route';

/**
 * Tracks in-app SPA navigation in sessionStorage.
 *
 * On hard page load / direct URL access: clears the flag (mount effect, empty deps).
 * On SPA navigation:                     writes the previous path (pathname effect).
 *
 * The login page back button reads this flag:
 *   - flag present  → navigated within the app  → router.back()
 *   - flag absent   → direct URL / hard refresh → router.push('/')
 */
export function RouteTracker() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  // Runs once on mount (page load or hard refresh). Clears any stale flag
  // left over from a previous session in this tab.
  useEffect(() => {
    sessionStorage.removeItem(KEY);
  }, []);

  // Runs whenever the pathname changes (SPA navigation only, not on initial mount
  // because prevPathRef starts as null).
  useEffect(() => {
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      sessionStorage.setItem(KEY, prevPathRef.current);
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  return null;
}
