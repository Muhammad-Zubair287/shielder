import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { prisma } from '@/config/database';
import { orderService } from '../order.service';
import { BadRequestError } from '../../../common/errors/api.error';
import { OrderStatus, PaymentStatus } from '@prisma/client';

describe('OrderService payment status transition', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects PAID to UNPAID transition before transaction', async () => {
    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      id: 'order-id',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID,
      deliveryType: 'DELIVERY',
      orderItems: [],
    } as any);
    jest.spyOn(prisma.systemSettings, 'findUnique').mockResolvedValue({
      allowOrderCancellation: true,
      autoCompleteOrderAfterPayment: true,
    } as any);
    const transactionSpy = jest.spyOn(prisma, '$transaction');

    await expect(
      orderService.updateOrderStatus('order-id', { paymentStatus: PaymentStatus.UNPAID })
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(transactionSpy).not.toHaveBeenCalled();
  });
});