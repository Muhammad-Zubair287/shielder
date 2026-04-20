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

      const products = await prisma.$queryRaw<Array<{
        id: string;
        stock: number | string;
        minimumStockThreshold: number | string;
        nameEn: string | null;
        brandName: string | null;
        total: number | string;
      }>>`
        SELECT
          p.id,
          p.stock,
          p.minimum_stock_threshold AS "minimumStockThreshold",
          COALESCE(pt.name, '') AS "nameEn",
          b.name AS "brandName",
          COUNT(*) OVER()::INT AS total
        FROM products p
        LEFT JOIN product_translations pt ON pt."productId" = p.id AND pt.locale = 'en'
        LEFT JOIN brands b ON b.id = p."brandId"
        WHERE p.is_active = true AND p.stock <= p.minimum_stock_threshold
        ORDER BY p.stock ASC, p.created_at ASC
        LIMIT ${limit} OFFSET ${skip}
      `;

      const total = Number(products[0]?.total || 0);
      const totalPages = Math.ceil(total / limit);

      const fullyLoadedProducts = products.map((product) => ({
        id: product.id,
        stock: Number(product.stock || 0),
        minimumStockThreshold: Number(product.minimumStockThreshold || 0),
        nameEn: product.nameEn || undefined,
        translations: product.nameEn ? [{ name: product.nameEn, locale: 'en' }] : [],
        brand: product.brandName ? { name: product.brandName } : undefined,
      }));

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
