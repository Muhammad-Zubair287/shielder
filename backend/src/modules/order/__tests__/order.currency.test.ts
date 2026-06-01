import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPrisma = {
  order: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockOrderRepository = {
  findByIdWithDetails: jest.fn(),
  list: jest.fn(),
  count: jest.fn(),
};

const mockSettingsService = {
  getCurrency: jest.fn(),
};

jest.mock('../order.repository', () => ({
  orderRepository: mockOrderRepository,
}));

jest.mock('@/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../settings/settings.service', () => ({
  __esModule: true,
  default: mockSettingsService,
}));

import { orderService } from '../order.service';

describe('OrderService currency response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsService.getCurrency.mockResolvedValue('SAR');
  });

  it('returns SAR on order details', async () => {
    mockOrderRepository.findByIdWithDetails.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      userId: 'user-1',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      orderItems: [],
    });

    const result = await orderService.getOrderById('order-1');

    expect(result.currency).toBe('SAR');
    expect(result.orderNumber).toBe('ORD-1');
  });

  it('returns SAR on customer order list', async () => {
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        orderNumber: 'ORD-1',
        userId: 'user-1',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        orderItems: [],
      },
    ]);

    const result = await orderService.getMyOrders('user-1', 1, 10);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].currency).toBe('SAR');
    expect(result.pagination.total).toBe(1);
  });
});