'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const KEY = 'prev_app_route';
const AUTH_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/forgot-password/verify',
  '/forgot-password/reset',
  '/reset-password',
  '/verify-email',
  '/verify-registration',
  '/admin/admin-2fa',
  '/superadmin/superadmin-2fa',
]);

function isAuthRoute(pathname: string): boolean {
  return Array.from(AUTH_ROUTES).some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Tracks in-app SPA navigation in sessionStorage.
 *
 * On hard page load / direct URL access: clears the flag (mount effect, empty deps).
 * On SPA navigation into auth pages:      writes the last non-auth path.
 *
 * The login page back button reads this flag:
 *   - flag present  → navigated within the app  → router.replace(flag)
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
      if (isAuthRoute(pathname) && !isAuthRoute(prevPathRef.current) && !pathname.startsWith('/api')) {
        sessionStorage.setItem(KEY, prevPathRef.current);
      }
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  return null;
}
