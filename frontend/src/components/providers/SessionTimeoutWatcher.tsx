'use client';

/**
 * SessionTimeoutWatcher
 * Reads `sessionTimeoutMinutes` from system settings and automatically
 * logs the user out after that many minutes of inactivity.
 *
 * Resets the countdown on any mouse/keyboard/touch/scroll activity.
 * Admin/SuperAdmin sessions use the configured value; the watcher is
 * dormant when nobody is logged in.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import settingsService from '@/services/settings.service';
import { STORAGE_KEYS } from '@/utils/constants';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const MIN_TIMEOUT_MINUTES = 5;
const MAX_TIMEOUT_MINUTES = 10;
const DEFAULT_TIMEOUT_MS = MAX_TIMEOUT_MINUTES * 60 * 1000; // 10 min fallback
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const getNow = () => Date.now();

function clearSessionExpiryState() {
  sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_TIMEOUT_MS);
}

function markSessionActivity() {
  sessionStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, String(getNow()));
}

function getLastActivityAt(): number | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

function getStoredTimeoutMs(): number {
  const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION_TIMEOUT_MS);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

function clampTimeoutMinutes(value: number): number {
  if (!Number.isFinite(value)) return MAX_TIMEOUT_MINUTES;
  return Math.min(MAX_TIMEOUT_MINUTES, Math.max(MIN_TIMEOUT_MINUTES, Math.floor(value)));
}

export default function SessionTimeoutWatcher() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuthStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutMsRef = useRef<number>(DEFAULT_TIMEOUT_MS);

  const expireSession = async () => {
    clearSessionExpiryState();
    toast.error(t('auth.sessionExpiredLoginAgain'), { duration: 3000 });
    await logout();
    router.replace('/login?expired=true');
  };

  const scheduleTimeout = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const lastActivityAt = getLastActivityAt();
    const timeoutMs = timeoutMsRef.current;

    if (lastActivityAt && getNow() - lastActivityAt >= timeoutMs) {
      void expireSession();
      return;
    }

    markSessionActivity();
    timerRef.current = setTimeout(() => {
      void expireSession();
    }, timeoutMs);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    if (isAdmin) {
      // Fetch configured session timeout from settings (admin/superadmin only)
      settingsService.getSettings()
        .then((res: any) => {
          const mins: number = res?.data?.data?.sessionTimeoutMinutes
            ?? res?.data?.sessionTimeoutMinutes
            ?? MAX_TIMEOUT_MINUTES;
          timeoutMsRef.current = clampTimeoutMinutes(mins) * 60 * 1000;
          sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT_MS, String(timeoutMsRef.current));
          scheduleTimeout();
        })
        .catch(() => {
          sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT_MS, String(timeoutMsRef.current));
          scheduleTimeout();
        });
    } else {
      // Customers use the default timeout — do not call /api/settings (requires admin)
      sessionStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT_MS, String(timeoutMsRef.current));
      scheduleTimeout();
    }

    // Attach activity listeners to reset the countdown
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, scheduleTimeout, { passive: true }));
    window.addEventListener('focus', scheduleTimeout);
    document.addEventListener('visibilitychange', scheduleTimeout);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, scheduleTimeout));
      window.removeEventListener('focus', scheduleTimeout);
      document.removeEventListener('visibilitychange', scheduleTimeout);
    };
  }, [isAuthenticated, user?.role]); // re-run when auth state changes

  return null; // purely behavioural component
}
