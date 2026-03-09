'use client';

/**
 * CurrencyContext
 * Reads the `currency` field from system settings once on mount and
 * exposes it to the entire app. All price displays use useCurrency()
 * to get the current symbol / code.
 *
 * Only fetches from the API when the user is authenticated (settings
 * endpoint requires auth). Falls back to 'SAR' for unauthenticated users.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import settingsService from '@/services/settings.service';

interface CurrencyCtx {
  currency: string; // ISO code e.g. "SAR", "USD", "EUR"
}

const CurrencyContext = createContext<CurrencyCtx>({ currency: 'SAR' });

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState('SAR');
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Only admins can call GET /api/settings (requireRoles ADMIN|SUPER_ADMIN).
    // Customers and unauthenticated users use the default ('SAR').
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (!isAuthenticated || !isAdmin) return;

    settingsService.getSettings()
      .then((res: any) => {
        const cur = res?.data?.data?.currency ?? res?.data?.currency ?? 'SAR';
        if (cur) setCurrency(cur);
      })
      .catch(() => { /* keep default */ });
  }, [isAuthenticated, user?.role]);

  return (
    <CurrencyContext.Provider value={{ currency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
