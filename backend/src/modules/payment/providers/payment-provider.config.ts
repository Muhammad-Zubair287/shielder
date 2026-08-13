/**
 * Server-side EPG provider resolution.
 * NEVER reads provider mode from request body/query — env only.
 */

import type { EpgProviderMode } from './payment-provider.types';

const VALID_PROVIDERS: EpgProviderMode[] = ['mock', 'sandbox', 'production'];

function isProductionRuntime(): boolean {
  return (process.env.NODE_ENV || 'development') === 'production';
}

function normalizeProvider(raw: string | undefined): EpgProviderMode {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'mock') return 'mock';
  if (value === 'production') return 'production';
  if (value === 'sandbox') return 'sandbox';
  if (isProductionRuntime()) return 'production';
  return 'sandbox';
}

/**
 * Fail-fast guard — called from env validation on startup.
 */
export function assertEpgProviderSafeForEnvironment(): void {
  const provider = normalizeProvider(process.env.EPG_PROVIDER);
  if (isProductionRuntime() && provider === 'mock') {
    throw new Error(
      'CRITICAL CONFIG ERROR: EPG_PROVIDER=mock is forbidden when NODE_ENV=production.',
    );
  }
}

export function getConfiguredEpgProvider(): EpgProviderMode {
  const provider = normalizeProvider(process.env.EPG_PROVIDER);
  if (isProductionRuntime() && provider === 'mock') {
    throw new Error('Mock EPG is not available in production');
  }
  return provider;
}

export function isMockEpgEnabled(): boolean {
  try {
    return getConfiguredEpgProvider() === 'mock' && !isProductionRuntime();
  } catch {
    return false;
  }
}

export function isValidEpgProvider(value: string): value is EpgProviderMode {
  return VALID_PROVIDERS.includes(value as EpgProviderMode);
}
