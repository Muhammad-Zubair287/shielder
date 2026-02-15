/**
 * Example Order Service
 * Demonstrates how to use stock deduction within a transaction
 */

import { PrismaClient } from '@prisma/client';
import { deductStock } from '@/common/utils/stock.utils';

const prisma = new PrismaClient();

class OrderService {
  /**
   * Processes an order and deducts stock
   * This is a sample implementation of requirement #7
   */
  static async processOrderPayment(orderId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch order items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new Error('Order not found');
      if (order.status === 'PAID') throw new Error('Order already processed');

      // 2. Deduct stock for each item using the utility function
      for (const item of order.items) {
        await deductStock(item.productId, item.quantity, tx);
      }

      // 3. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      // 4. Trigger Notifications
      try {
        const { NotificationService } = require('../../notification/notification.service');
        const { NotificationType, UserRole } = require('@prisma/client');

        // Notification for User
        await NotificationService.createNotification({
          type: NotificationType.PAYMENT_SUCCESS,
          title: 'Payment Successful',
          message: `Your payment for order #${order.orderNumber} was successful.`,
          userId: order.userId,
        });

        // Notification for Admin
        await NotificationService.createNotification({
          type: NotificationType.NEW_ORDER,
          title: 'New Paid Order',
          message: `A new order #${order.orderNumber} has been paid and is ready for processing.`,
          roleTarget: UserRole.ADMIN,
        });
      } catch (err) {
          // In production use logger.error
          console.error('Failed to create order notifications:', err);
      }

      return updatedOrder;
    });
  }
}

export { OrderService };
