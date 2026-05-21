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
import redisCacheService from '@/common/services/redis-cache.service';

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


     // Use transaction to ensure both product.stock and warehouse inventory are updated atomically
     const updated = await prisma.$transaction(async (tx) => {
       // 1. Update product aggregate stock
       const updatedProduct = await tx.product.update({
         where: { id: productId },
         data: { stock },
       });

       // 2. Also update the main warehouse inventory to keep it in sync
       try {
         const inventoryService = require('@/modules/inventory/inventory.service').inventoryService;
         const mainWarehouseId = await inventoryService.resolveMainWarehouseId();
       
         // Update or create inventory record with same quantity
         await tx.inventory.upsert({
           where: {
             productId_warehouseId: {
               productId,
               warehouseId: mainWarehouseId,
             },
           },
           update: {
             quantity: Math.max(0, Math.trunc(stock)),
             updated_at: new Date(),
           },
           create: {
             productId,
             warehouseId: mainWarehouseId,
             quantity: Math.max(0, Math.trunc(stock)),
             reservedQuantity: 0,
           },
         });
       } catch (err) {
         // Log but don't fail - warehouse update is secondary
         logger.warn(`Failed to sync warehouse inventory for product ${productId} during stock update:`, err);
       }

       return updatedProduct;
     });

    // Invalidate product-related caches
    await this.invalidateProductCaches(productId);

    // Check if we need to alert
    await this.checkAndNotify(productId);

    return updated;
  }

  /**
   * Invalidate all product-related caches when stock changes
   */
  private static async invalidateProductCaches(productId: string) {
    const cacheKeysToInvalidate = [
      `product:${productId}`,
      `product:${productId}:details`,
      'products:list', // List views may be affected
      'products:featured', // Featured products cache
    ];

    await Promise.all(
      cacheKeysToInvalidate.map(key =>
        redisCacheService.del(key).catch(err =>
          logger.warn(`Failed to invalidate cache key ${key}:`, err)
        )
      )
    );
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
