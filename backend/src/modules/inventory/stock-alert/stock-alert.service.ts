/**
 * Stock Alert Service
 * Handles business logic for low stock management
 */

import { PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';

const prisma = new PrismaClient();

class StockAlertService {
  /**
   * Get low stock products with pagination
   */
  static async getLowStockProducts(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // We use raw query here because Prisma currently doesn't support column-to-column comparison natively in 'where' clause
    const products: any[] = await prisma.$queryRaw`
      SELECT p.*, c.id as "categoryId", b.id as "brandId"
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN brands b ON p."brandId" = b.id
      WHERE p.is_active = true AND p.stock <= p.minimum_stock_threshold
      ORDER BY p.stock ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalCountResult: any[] = await prisma.$queryRaw`
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
  }

  /**
   * Get low stock count for dashboard
   */
  static async getLowStockCount() {
    const result: any[] = await prisma.$queryRaw`
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

    return prisma.product.update({
      where: { id: productId },
      data: { stock } as any,
    });
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
      data: { minimumStockThreshold: threshold } as any,
    });
  }
}

export { StockAlertService };
