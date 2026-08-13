import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { clearMockEpgStore, getMockSession, setMockForcedRefundScenario } from '../providers/mock-epg.store';
import { MockEPGProvider } from '../providers/mock-epg.provider';
import {
  getConfiguredEpgProvider,
  isMockEpgEnabled,
} from '../providers/payment-provider.config';
import {
  getPaymentGatewayProvider,
  resetPaymentGatewayProviderCache,
} from '../providers/payment-provider.factory';

describe('Payment provider configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetPaymentGatewayProviderCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetPaymentGatewayProviderCache();
  });

  it('defaults to sandbox in non-production when EPG_PROVIDER unset', () => {
    delete process.env.EPG_PROVIDER;
    process.env.NODE_ENV = 'development';
    expect(getConfiguredEpgProvider()).toBe('sandbox');
  });

  it('uses mock when EPG_PROVIDER=mock in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.EPG_PROVIDER = 'mock';
    expect(getConfiguredEpgProvider()).toBe('mock');
    expect(isMockEpgEnabled()).toBe(true);
  });

  it('rejects mock in production at runtime', () => {
    process.env.NODE_ENV = 'production';
    process.env.EPG_PROVIDER = 'mock';
    expect(() => getConfiguredEpgProvider()).toThrow(/Mock EPG is not available/);
  });

  it('factory returns MockEPGProvider when mock enabled', () => {
    process.env.NODE_ENV = 'development';
    process.env.EPG_PROVIDER = 'mock';
    resetPaymentGatewayProviderCache();
    const provider = getPaymentGatewayProvider();
    expect(provider.mode).toBe('mock');
    expect(provider.requiresApiCredentials()).toBe(false);
  });
});

describe('MockEPGProvider', () => {
  beforeEach(() => {
    clearMockEpgStore();
  });

  it('creates session with mock payment URL pointing to frontend dev page', async () => {
    const provider = new MockEPGProvider();
    const result = await provider.createPaymentSession({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      amount: 100,
      currency: 'SAR',
      customerName: 'Test',
      phoneNumber: '+966500000000',
      successUrl: 'http://localhost:3000/success',
      failureUrl: 'http://localhost:3000/fail',
      userId: 'user-1',
    });

    expect(result.sessionId).toMatch(/^mock_/);
    expect(result.paymentUrl).toContain('/dev/mock-epg?session=');
    expect(result.provider).toBe('mock');

    const stored = getMockSession(result.sessionId);
    expect(stored?.orderId).toBe('ord-1');
    expect(stored?.amount).toBe(100);
  });

  it('refund succeeds after capture', async () => {
    const provider = new MockEPGProvider();
    const { sessionId } = await provider.createPaymentSession({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      amount: 50,
      currency: 'SAR',
      customerName: 'Test',
      phoneNumber: '+966500000000',
      successUrl: 'http://localhost/s',
      failureUrl: 'http://localhost/f',
      userId: 'user-1',
    });

    provider.markSessionCaptured(sessionId);
    const refund = await provider.refundCapturedPayment({
      sessionId,
      amount: 50,
      orderNumber: 'ORD-1',
    });

    expect(refund.success).toBe(true);
    expect(refund.refundId).toMatch(/^mock_refund_/);
    expect(getMockSession(sessionId)?.refunded).toBe(true);
  });

  it('refund failure scenario returns failure', async () => {
    const provider = new MockEPGProvider();
    const { sessionId } = await provider.createPaymentSession({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      amount: 50,
      currency: 'SAR',
      customerName: 'Test',
      phoneNumber: '+966500000000',
      successUrl: 'http://localhost/s',
      failureUrl: 'http://localhost/f',
      userId: 'user-1',
    });

    provider.markSessionCaptured(sessionId);
    setMockForcedRefundScenario(sessionId, 'refund_failure');

    const refund = await provider.refundCapturedPayment({ sessionId, amount: 50 });
    expect(refund.success).toBe(false);
    expect(refund.reason).toBe('mock_refund_failure');
  });

  it('already refunded is idempotent', async () => {
    const provider = new MockEPGProvider();
    const { sessionId } = await provider.createPaymentSession({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      amount: 50,
      currency: 'SAR',
      customerName: 'Test',
      phoneNumber: '+966500000000',
      successUrl: 'http://localhost/s',
      failureUrl: 'http://localhost/f',
      userId: 'user-1',
    });

    provider.markSessionCaptured(sessionId);
    await provider.refundCapturedPayment({ sessionId, amount: 50 });
    const second = await provider.refundCapturedPayment({ sessionId, amount: 50 });

    expect(second.success).toBe(true);
    expect(second.skipped).toBe(true);
    expect(second.reason).toBe('already_refunded');
  });

  it('refund before capture fails', async () => {
    const provider = new MockEPGProvider();
    const { sessionId } = await provider.createPaymentSession({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      amount: 50,
      currency: 'SAR',
      customerName: 'Test',
      phoneNumber: '+966500000000',
      successUrl: 'http://localhost/s',
      failureUrl: 'http://localhost/f',
      userId: 'user-1',
    });

    const refund = await provider.refundCapturedPayment({ sessionId, amount: 50 });
    expect(refund.success).toBe(false);
    expect(refund.reason).toBe('payment_not_captured');
  });
});

describe('Mock concurrency simulation', () => {
  it('only one atomic deduct succeeds when stock=1', async () => {
    let stock = 1;
    const tryDeduct = async () => {
      if (stock >= 1) {
        stock -= 1;
        return true;
      }
      return false;
    };
    const [a, b] = await Promise.all([tryDeduct(), tryDeduct()]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(stock).toBe(0);
  });
});
