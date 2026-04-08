/**
 * Stock Alert Service
 * Handles business logic for low stock management
 */

import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { prisma } from '@/config/database';
import NotificationService from '@/modules/notification/notification.service';
import { NotificationType, UserRole } from '@prisma/client';

class StockAlertService {
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
      
      await NotificationService.notify({
        type: NotificationType.LOW_STOCK,
        title: 'Low Stock Alert',
        message: `Product "${productName}" is below its minimum threshold. Current stock: ${product.stock}`,
        module: 'INVENTORY',
        roleTarget: UserRole.SUPER_ADMIN,
        relatedId: productId,
        metadata: { sku: product.sku, stock: product.stock }
      });
    }
  }
  /**
   * Get low stock products with pagination
   */
  static async getLowStockProducts(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      // We use raw query here because Prisma currently doesn't support column-to-column comparison natively in 'where' clause
      const products = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT p.*, c.id as "categoryId", b.id as "brandId"
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        LEFT JOIN brands b ON p."brandId" = b.id
        WHERE p.is_active = true AND p.stock <= p.minimum_stock_threshold
        ORDER BY p.stock ASC
        LIMIT ${limit} OFFSET ${skip}
      `;

      const totalCountResult = await prisma.$queryRaw<Array<{ count: number | string }>>`
        SELECT COUNT(*) as count
        FROM products
        WHERE is_active = true AND stock <= minimum_stock_threshold
      `;

      const total = Number(totalCountResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      // Fetch related data for the products (translations, etc.) using Prisma for ease of use
      const productIds = products.map(p => p.id);
      const fullyLoadedProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds }
        },
        include: {
          category: true,
          brand: true,
          translations: {
            where: { locale: 'en' },
            take: 1,
          },
        },
        orderBy: {
          stock: 'asc',
        }
      });

      return {
        products: fullyLoadedProducts,
        pagination: {
          total,
          page,
          totalPages,
        },
      };
    } catch (error: unknown) {
      console.error('ERROR in getLowStockProducts:', error);
      throw error;
    }
  }

  /**
   * Get low stock count for dashboard
   */
  static async getLowStockCount() {
    const result = await prisma.$queryRaw<Array<{ count: number | string }>>`
      SELECT COUNT(*) as count
      FROM products
      WHERE is_active = true AND stock <= minimum_stock_threshold
    `;

    const count = Number(result[0]?.count || 0);

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
