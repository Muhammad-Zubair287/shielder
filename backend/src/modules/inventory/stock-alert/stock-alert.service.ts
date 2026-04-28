/**
 * Stock Alert Service
 * Handles business logic for low stock management
 */

import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { logger } from '@/common/logger/logger';
import { prisma } from '@/config/database';
import { stockAlertRepository } from './stock-alert.repository';
import NotificationService from '@/modules/notification/notification.service';
import { NotificationType, UserRole } from '@prisma/client';

class StockAlertService {
  private static normalizeTranslations(value: unknown): Array<{ name: string; locale: string }> {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value as Array<{ name: string; locale: string }>;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as Array<{ name: string; locale: string }>) : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Check and notify if stock is low
   */
  static async checkAndNotify(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        translations: { where: { locale: 'en' }, take: 1 }
      }
    });

    if (product && product.isActive && product.stock <= product.minimumStockThreshold) {
      const productName = product.translations[0]?.name || 'Unknown Product';

      const payload = {
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert',
        message: `Product "${productName}" is below its minimum threshold. Current stock: ${product.stock}`,
        module: 'INVENTORY' as const,
        relatedId: productId,
        metadata: { sku: product.sku, stock: product.stock },
      };

      await Promise.all([
        NotificationService.notify({
          ...payload,
          roleTarget: UserRole.SUPER_ADMIN,
        }),
        NotificationService.notify({
          ...payload,
          roleTarget: UserRole.ADMIN,
        }),
      ]);
    }
  }
  /**
   * Get low stock products with pagination
   */
  static async getLowStockProducts(page: number = 1, limit: number = 10) {
    try {
      const products = await stockAlertRepository.getLowStockProducts(page, limit);
      
      const total = products[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      // Map repository response to maintain service layer response contract
      const fullyLoadedProducts = products.map((product) => ({
        id: product.id,
        stock: Number(product.stock || 0),
        minimumStockThreshold: Number(product.minimumStockThreshold || 0),
        nameEn: product.nameEn || undefined,
        translations: this.normalizeTranslations(product.translations),
        brand: product.brand ? { name: product.brand } : undefined,
        category: product.category || undefined,
      }));

      return {
        data: {
          products: fullyLoadedProducts,
          pagination: {
            total,
            page,
            totalPages,
          },
        },
      };
    } catch (error: unknown) {
      logger.error('ERROR in getLowStockProducts:', error);
      throw error;
    }
  }

  /**
   * Get low stock count for dashboard
   */
  static async getLowStockCount() {
    const count = await stockAlertRepository.getLowStockCount();
    return { lowStockCount: count };
  }

  /**
   * Update product stock manually
   */
  static async updateStock(productId: string, stock: number) {
    if (stock < 0) {
      throw new BadRequestError('Stock cannot be negative');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock },
    });

    // Check if we need to alert
    await this.checkAndNotify(productId);

    return updated;
  }

  /**
   * Update product minimum stock threshold
   */
  static async updateThreshold(productId: string, threshold: number) {
    if (threshold < 0) {
      throw new BadRequestError('Threshold cannot be negative');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return prisma.product.update({
      where: { id: productId },
      data: { minimumStockThreshold: threshold },
    });
  }
}

export { StockAlertService };
