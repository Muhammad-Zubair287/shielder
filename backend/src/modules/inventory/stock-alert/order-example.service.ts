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
        include: { orderItems: true },
      });

      if (!order) throw new Error('Order not found');
      if (order.paymentStatus === 'PAID') throw new Error('Order already processed');

      // 2. Deduct stock for each item using the utility function
      for (const item of (order as any).orderItems) {
        await deductStock(item.productId, item.quantity, tx as any);
      }

      // 3. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        },
      });

      // 4. Trigger Notifications
      try {
        const NotificationService = (await import('../../notification/notification.service')).default;
        const { NotificationType, UserRole } = await import('@prisma/client');

        // Notification for User
        await NotificationService.notify({
          type: NotificationType.PAYMENT_SUCCESSFUL,
          title: 'Payment Successful',
          message: `Your payment for order #${order.orderNumber} was successful.`,
          module: 'ORDER',
          userId: order.userId,
          relatedId: order.id
        });

        // Notification for Admin
        await NotificationService.notify({
          type: NotificationType.ORDER_CREATED,
          title: 'New Paid Order',
          message: `A new order #${order.orderNumber} has been paid and is ready for processing.`,
          module: 'ORDER',
          roleTarget: UserRole.ADMIN,
          relatedId: order.id
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
