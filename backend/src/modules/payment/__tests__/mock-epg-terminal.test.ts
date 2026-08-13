import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import {
  clearMockEpgStore,
  createMockSession,
  getMockSession,
  markMockSessionTerminal,
  isMockSessionExecutable,
} from '../providers/mock-epg.store';
import { MockEpgDevService } from '../mock-epg.dev.service';
import { EPGService } from '../epg.service';

jest.mock('../../../config/database', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../providers/payment-provider.config', () => ({
  isMockEpgEnabled: () => true,
}));

jest.mock('../providers/payment-provider.factory', () => ({
  getMockProvider: () => ({
    markSessionCaptured: jest.fn(),
  }),
}));

import { prisma } from '../../../config/database';

describe('Mock EPG session terminal state', () => {
  beforeEach(() => {
    clearMockEpgStore();
    jest.clearAllMocks();
  });

  it('marks session non-executable after terminal status', () => {
    createMockSession({
      sessionId: 'mock_sess_1',
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      amount: 100,
      currency: 'SAR',
      userId: 'user-1',
    });

    expect(isMockSessionExecutable('mock_sess_1')).toBe(true);
    markMockSessionTerminal('mock_sess_1', 'success', '/order-confirmation/ord-1?payment=success');
    expect(isMockSessionExecutable('mock_sess_1')).toBe(false);
    expect(getMockSession('mock_sess_1')?.terminalRedirectUrl).toContain('/order-confirmation/');
  });

  it('does not re-run handleCallback when session is already terminal', async () => {
    createMockSession({
      sessionId: 'mock_sess_2',
      orderId: 'ord-2',
      orderNumber: 'ORD-2',
      amount: 50,
      currency: 'SAR',
      userId: 'user-1',
    });
    markMockSessionTerminal('mock_sess_2', 'success', '/order-confirmation/ord-2?payment=success');

    const handleCallback = jest.fn();
    const epgService = { handleCallback, handleWebhook: jest.fn(), refundCapturedPayment: jest.fn() } as unknown as EPGService;
    const devService = new MockEpgDevService(epgService);

    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-2',
      orderNumber: 'ORD-2',
      total: 50,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.CONFIRMED,
    });

    const result = await devService.triggerScenario('mock_sess_2', 'success', 'user-1');

    expect(handleCallback).not.toHaveBeenCalled();
    expect(result.redirectUrl).toBe('/order-confirmation/ord-2?payment=success');
    expect(result.callbackResult?.skipped).toBe(true);
  });

  it('marks session terminal after first successful trigger', async () => {
    createMockSession({
      sessionId: 'mock_sess_3',
      orderId: 'ord-3',
      orderNumber: 'ORD-3',
      amount: 75,
      currency: 'SAR',
      userId: 'user-1',
    });

    const handleCallback = jest.fn().mockResolvedValue({
      success: true,
      orderId: 'ord-3',
      orderNumber: 'ORD-3',
    });
    const epgService = {
      handleCallback,
      handleWebhook: jest.fn().mockResolvedValue({ received: true }),
      refundCapturedPayment: jest.fn(),
    } as unknown as EPGService;
    const devService = new MockEpgDevService(epgService);

    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-3',
      orderNumber: 'ORD-3',
      total: 75,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
    });

    await devService.triggerScenario('mock_sess_3', 'success', 'user-1');

    expect(isMockSessionExecutable('mock_sess_3')).toBe(false);
    expect(getMockSession('mock_sess_3')?.terminalStatus).toBe('success');

    await devService.triggerScenario('mock_sess_3', 'failed', 'user-1');
    expect(handleCallback).toHaveBeenCalledTimes(1);
  });

  it('builds cancelled redirect with payment.cancelled messageKey', async () => {
    createMockSession({
      sessionId: 'mock_sess_cancel',
      orderId: 'ord-c',
      orderNumber: 'ORD-C',
      amount: 40,
      currency: 'SAR',
      userId: 'user-1',
    });

    const handleCallback = jest.fn().mockResolvedValue({
      success: false,
      orderId: 'ord-c',
      orderNumber: 'ORD-C',
      reason: 'cancelled',
    });
    const epgService = {
      handleCallback,
      handleWebhook: jest.fn(),
      refundCapturedPayment: jest.fn(),
    } as unknown as EPGService;
    const devService = new MockEpgDevService(epgService);

    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'ord-c',
      orderNumber: 'ORD-C',
      total: 40,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
    });

    const result = await devService.triggerScenario('mock_sess_cancel', 'cancelled', 'user-1');
    expect(result.redirectUrl).toContain('messageKey=payment.cancelled');
    expect(getMockSession('mock_sess_cancel')?.terminalStatus).toBe('cancelled');
  });
});

describe('Joi i18n shipping address message', () => {
  it('translates custom schema message keys', async () => {
    const { translateJoiError } = await import('../../../common/i18n');
    const detail = {
      type: 'string.min',
      message: 'validation.shippingAddressMin',
      context: { limit: 5 },
    };
    expect(translateJoiError(detail, 'en')).toBe('Address must be at least 5 characters.');
    expect(translateJoiError(detail, 'ar')).toContain('5');
  });
});
