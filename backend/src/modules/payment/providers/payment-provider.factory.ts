import { getConfiguredEpgProvider } from './payment-provider.config';
import type { PaymentGatewayProvider } from './payment-provider.types';
import { MockEPGProvider, mockEpgProvider } from './mock-epg.provider';
import { RealEtisalatEPGProvider } from './real-etisalat-epg.provider';

let cachedProvider: PaymentGatewayProvider | null = null;

export function getPaymentGatewayProvider(): PaymentGatewayProvider {
  if (cachedProvider) return cachedProvider;

  const mode = getConfiguredEpgProvider();

  if (mode === 'mock') {
    cachedProvider = mockEpgProvider;
  } else if (mode === 'production') {
    cachedProvider = new RealEtisalatEPGProvider('production');
  } else {
    cachedProvider = new RealEtisalatEPGProvider('sandbox');
  }

  return cachedProvider;
}

/** Test helper — reset singleton between tests */
export function resetPaymentGatewayProviderCache(): void {
  cachedProvider = null;
}

export function getMockProvider(): MockEPGProvider | null {
  const provider = getPaymentGatewayProvider();
  return provider instanceof MockEPGProvider ? provider : null;
}
