import { prisma } from '@/config/database';
import { PaymentStatus } from '@prisma/client';

export class ReportsRepository {
  getPaidSalesAggregate(from: Date, to: Date) {
    return prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
  }

  countOrders(from: Date, to: Date) {
    return prisma.order.count({ where: { createdAt: { gte: from, lte: to } } });
  }

  getRefundAggregate(from: Date, to: Date) {
    return prisma.payment.aggregate({
      where: {
        status: PaymentStatus.REFUNDED,
        createdAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
  }

  getInventoryStockAggregate() {
    return prisma.product.aggregate({ where: { isActive: true }, _sum: { stock: true } });
  }
}

export const reportsRepository = new ReportsRepository();
