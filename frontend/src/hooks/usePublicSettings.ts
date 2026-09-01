'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import settingsService, {
  getCompanyEmailFromPublicSettings,
  getCompanyPhoneFromPublicSettings,
  type PublicSettings,
} from '@/services/settings.service';
import { DATA_CHANGED_EVENT } from '@/components/providers/CrossTabSyncProvider';

export const PUBLIC_SETTINGS_QUERY_KEY = ['public-settings'] as const;

async function fetchPublicSettings(): Promise<PublicSettings | null> {
  const res = await settingsService.getPublicSettings();
  if (res?.data?.success) {
    return (res.data.data as PublicSettings) ?? null;
  }
  return null;
}

/**
 * Shared hook for customer-facing pages (Navbar, Footer, Contact Us, Resources).
 * Fetches the public settings subset and refetches when settings change
 * (cross-tab DATA_CHANGED or React Query invalidation via settings:updated).
 */
export function usePublicSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PUBLIC_SETTINGS_QUERY_KEY,
    queryFn: fetchPublicSettings,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ module: string }>).detail;
      if (detail?.module === 'settings') {
        queryClient.invalidateQueries({ queryKey: PUBLIC_SETTINGS_QUERY_KEY });
      }
    };

    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, [queryClient]);

  const settings = query.data ?? null;
  const companyEmail = getCompanyEmailFromPublicSettings(settings);
  const companyPhone = getCompanyPhoneFromPublicSettings(settings);

  return {
    settings,
    companyEmail,
    companyPhone,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
