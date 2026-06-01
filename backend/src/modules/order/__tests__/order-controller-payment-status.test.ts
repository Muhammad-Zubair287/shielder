import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { BadRequestError } from '../../../common/errors/api.error';

const getOrderByIdMock = jest.fn();
const updateOrderStatusMock = jest.fn();

jest.mock('../order.service', () => ({
  orderService: {
    getOrderById: (...args: any[]) => getOrderByIdMock(...args),
    updateOrderStatus: (...args: any[]) => updateOrderStatusMock(...args),
  },
}));

import { OrderController } from '../order.controller';

describe('OrderController payment status transition', () => {
  const controller = new OrderController();

  beforeEach(() => {
    getOrderByIdMock.mockReset();
    updateOrderStatusMock.mockReset();
  });

  it('rejects PAID to UNPAID transition before update', async () => {
    getOrderByIdMock.mockResolvedValue({ paymentStatus: 'PAID' });
    const req: any = {
      params: { id: 'order-id' },
      body: { paymentStatus: 'UNPAID' },
      user: { role: 'ADMIN', email: 'admin@example.com' },
    };
    const res: any = { json: jest.fn() };
    const next = jest.fn();

    await controller.updateStatus(req, res, next);

    expect(updateOrderStatusMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(BadRequestError);
    expect(next.mock.calls[0][0].message).toBe('Payment status cannot be changed once marked as PAID');
  });
});