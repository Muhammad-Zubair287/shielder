import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPrisma: any = {
  payment: {
    aggregate: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockSettingsService: any = {
  getCurrency: jest.fn(),
};

jest.mock('../../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../settings/settings.service', () => ({
  __esModule: true,
  default: mockSettingsService,
}));

import { PaymentService } from '../payment.service';

describe('PaymentService currency response', () => {
  const paymentService = new PaymentService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsService.getCurrency.mockResolvedValue('SAR');
  });

  it('returns SAR in payment stats', async () => {
    mockPrisma.payment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 250 } })
      .mockResolvedValueOnce({ _sum: { amount: 100 } });
    mockPrisma.payment.count.mockResolvedValueOnce(2);
    mockPrisma.payment.count.mockResolvedValueOnce(1);

    const result = await paymentService.getPaymentStats();

    expect(result.currency).toBe('SAR');
    expect(result.totalRevenue).toBe(900);
    expect(result.pendingPayments).toBe(2);
  });

  it('returns SAR in payment list and nested payment records', async () => {
    mockPrisma.payment.count.mockResolvedValueOnce(1);
    mockPrisma.payment.findMany.mockResolvedValueOnce([
      {
        id: 'payment-1',
        orderId: 'order-1',
        amount: 100,
        method: 'CASH',
        status: 'PAID',
        createdAt: new Date(),
        order: {
          orderNumber: 'ORD-1',
          customerName: 'Customer One',
          total: 100,
        },
        recorder: {
          profile: {
            fullName: 'Admin User',
          },
        },
      },
    ]);

    const result = await paymentService.getAllPayments({}, { page: 1, limit: 10, skip: 0 });

    expect(result.currency).toBe('SAR');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].currency).toBe('SAR');
  });
});