import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { OrderStatus, PaymentStatus, StockChangeType } from '@prisma/client';
import { BadRequestError } from '../../../common/errors/api.error';
import { prisma } from '@/config/database';
import { orderService } from '../order.service';
import { inventoryService } from '../../inventory/inventory.service';
import { inventoryRepository } from '../../inventory/inventory.repository';

describe('OrderService stock-on-payment flow', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('createOrder checks stock availability without reserving', async () => {
    const assertSpy = jest
      .spyOn(inventoryService, 'assertAvailableStock')
      .mockResolvedValue(undefined as any);
    const reserveSpy = jest.spyOn(inventoryService, 'reserveStock');

    jest.spyOn(inventoryService, 'resolveWarehouseForOrder').mockResolvedValue('wh-1');
    jest.spyOn(prisma.warehouse, 'findUnique').mockResolvedValue({
      id: 'wh-1',
      isActive: true,
      name: 'Main Warehouse',
    } as any);
    jest.spyOn(prisma.systemSettings, 'findUnique').mockResolvedValue({
      defaultOrderStatus: OrderStatus.PENDING,
      paymentMethodsEnabled: ['CASH'],
    } as any);

    jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      const tx = {
        inventory: {
          upsert: jest.fn().mockResolvedValue({}),
        },
        product: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'prod-1',
            price: 100,
            translations: [{ name: 'Filter' }],
          }),
        },
        product_variants: { findUnique: jest.fn() },
        order: {
          create: jest.fn().mockResolvedValue({
            id: 'order-1',
            orderNumber: 'ORD-1',
            total: 110,
            userId: 'user-1',
            orderItems: [],
          }),
        },
      };
      return fn(tx);
    });

    await orderService.createOrder({
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      customerName: 'Test User',
      phoneNumber: '+966500000000',
      shippingAddress: 'Riyadh',
      paymentMethod: 'CASH',
      deliveryType: 'DELIVERY',
    });

    expect(assertSpy).toHaveBeenCalled();
    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it('updateOrderStatus does not deduct stock on DELIVERED', async () => {
    const deductSpy = jest.spyOn(orderService, 'deductInventoryAfterPaymentSuccess');
    const consumeSpy = jest.spyOn(inventoryService, 'consumeReservedStock');

    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: OrderStatus.SHIPPED,
      paymentStatus: PaymentStatus.PAID,
      deliveryType: 'DELIVERY',
      warehouseId: null,
      userId: 'user-1',
      orderItems: [],
    } as any);
    jest.spyOn(prisma.systemSettings, 'findUnique').mockResolvedValue({
      allowOrderCancellation: true,
      autoCompleteOrderAfterPayment: false,
    } as any);
    jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      const tx = {
        order: {
          update: jest.fn().mockResolvedValue({
            id: 'order-1',
            status: OrderStatus.DELIVERED,
          }),
        },
      };
      return fn(tx);
    });

    await orderService.updateOrderStatus('order-1', {
      status: OrderStatus.DELIVERED,
      performedBy: 'admin',
    });

    expect(deductSpy).not.toHaveBeenCalled();
    expect(consumeSpy).not.toHaveBeenCalled();
  });

  it('updateOrderStatus deducts stock when payment becomes PAID', async () => {
    const deductSpy = jest
      .spyOn(orderService, 'deductInventoryAfterPaymentSuccess')
      .mockResolvedValue('deducted');

    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      deliveryType: 'DELIVERY',
      warehouseId: null,
      userId: 'user-1',
      orderItems: [],
    } as any);
    jest.spyOn(prisma.systemSettings, 'findUnique').mockResolvedValue({
      allowOrderCancellation: true,
      autoCompleteOrderAfterPayment: false,
    } as any);
    jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      const tx = {
        order: {
          update: jest.fn().mockResolvedValue({
            id: 'order-1',
            paymentStatus: PaymentStatus.PAID,
          }),
        },
      };
      return fn(tx);
    });

    await orderService.updateOrderStatus('order-1', {
      paymentStatus: PaymentStatus.PAID,
      performedBy: 'admin',
    });

    expect(deductSpy).toHaveBeenCalledWith('order-1', 'admin', expect.anything());
  });

  it('deductInventoryAfterPaymentSuccess is idempotent via stock_history', async () => {
    jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      const tx = {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'order-1',
            orderNumber: 'ORD-1',
            deliveryType: 'DELIVERY',
            warehouseId: null,
            orderItems: [{ productId: 'prod-1', quantity: 1, variantId: null, product: { translations: [] }, variant: null }],
          }),
        },
        stock_history: {
          findFirst: jest.fn().mockResolvedValue({ id: 'hist-1' }),
        },
      };
      return fn(tx);
    });

    const result = await orderService.deductInventoryAfterPaymentSuccess('order-1', 'EPG');
    expect(result).toBe('already_deducted');
  });

  it('cancel before deduction does not restore stock', async () => {
    const increaseSpy = jest.spyOn(inventoryService, 'increaseStock');
    jest.spyOn(inventoryRepository, 'releaseReservedStock').mockResolvedValue(null);

    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      deliveryType: 'DELIVERY',
      warehouseId: null,
      userId: 'user-1',
      orderItems: [
        {
          productId: 'prod-1',
          quantity: 2,
          variantId: null,
          product: { translations: [{ name: 'Filter' }] },
          variant: null,
        },
      ],
    } as any);
    jest.spyOn(prisma.systemSettings, 'findUnique').mockResolvedValue({
      allowOrderCancellation: true,
      autoCompleteOrderAfterPayment: false,
    } as any);
    jest.spyOn(inventoryService, 'resolveWarehouseForOrder').mockResolvedValue('wh-1');

    jest.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      const tx = {
        stock_history: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        order: {
          update: jest.fn().mockResolvedValue({
            id: 'order-1',
            status: OrderStatus.CANCELLED,
          }),
        },
      };
      return fn(tx);
    });

    await orderService.updateOrderStatus('order-1', {
      status: OrderStatus.CANCELLED,
      performedBy: 'admin',
    });

    expect(increaseSpy).not.toHaveBeenCalled();
  });

  it('rejects PAID to UNPAID', async () => {
    jest.spyOn(prisma.order, 'findUnique').mockResolvedValue({
      id: 'order-id',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID,
      deliveryType: 'DELIVERY',
      orderItems: [],
    } as any);
    jest.spyOn(prisma.systemSettings, 'findUnique').mockResolvedValue({
      allowOrderCancellation: true,
      autoCompleteOrderAfterPayment: false,
    } as any);

    await expect(
      orderService.updateOrderStatus('order-id', { paymentStatus: PaymentStatus.UNPAID }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('InventoryRepository payment deduction SQL contract', () => {
  it('exposes deductStockOnPayment', () => {
    expect(typeof inventoryRepository.deductStockOnPayment).toBe('function');
    expect(typeof inventoryService.deductStockOnPayment).toBe('function');
    expect(typeof inventoryService.assertAvailableStock).toBe('function');
  });

  it('documents that ORDER_COMPLETED history marks deduction', () => {
    expect(StockChangeType.ORDER_COMPLETED).toBe('ORDER_COMPLETED');
    expect(StockChangeType.ORDER_CANCELLED).toBe('ORDER_CANCELLED');
  });
});
