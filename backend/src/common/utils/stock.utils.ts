/**
 * Stock Utility Functions
 * Helper functions for stock-related logic
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/common/logger/logger';

const prisma = new PrismaClient();

/**
 * Deducts stock for a product and triggers notification if it falls below threshold
 */
export const deductStock = async (
  productId: string,
  quantity: number,
  tx?: any
) => {
  const client = tx || prisma;

  // 1. Fetch current stock and threshold
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, minimumStockThreshold: true, translations: { take: 1 } },
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  const newStock = product.stock - quantity;

  if (newStock < 0) {
    throw new Error(`Insufficient stock for product ${productId}. Current: ${product.stock}, Requested: ${quantity}`);
  }

  // 2. Update stock
  const updatedProduct = await client.product.update({
    where: { id: productId },
    data: { stock: newStock },
  });

  // 3. Trigger notification if below threshold
  if (newStock <= product.minimumStockThreshold) {
    const productName = product.translations[0]?.name || 'Unknown Product';
    
    try {
      const { NotificationService } = require('@/modules/notification/notification.service');
      const { NotificationType, UserRole } = require('@prisma/client');

      await NotificationService.createNotification({
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert',
        message: `Product "${productName}" is running low on stock. Current: ${newStock}`,
        roleTarget: UserRole.ADMIN,
      });
      
      logger.info(`Low stock notification created for product: ${productId}`);
    } catch (error) {
      logger.error('Failed to create low stock notification:', error);
    }
  }

  return updatedProduct;
};
