/**
 * Stock Alert Repository
 * Database access layer for low-stock inventory queries
 */

import { prisma } from '@/config/database';

type LowStockProductRow = {
  id: string;
  stock: number;
  minimumStockThreshold: number;
  nameEn: string;
  translations: unknown;
  brand: string;
  category: string;
  total: number;
};

class StockAlertRepository {
  /**
   * Get low-stock products with pagination
   * Uses window function to get total count in single query (avoids N+1)
   */
  async getLowStockProducts(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const rows = await prisma.$queryRaw<LowStockProductRow[]>`
      SELECT
        p.id,
        p.stock,
        p.minimum_stock_threshold AS "minimumStockThreshold",
        COALESCE(MAX(CASE WHEN pt.locale = 'en' THEN pt.name END), '') AS "nameEn",
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'locale', pt.locale,
              'name', pt.name
            )
          ) FILTER (WHERE pt.locale IS NOT NULL),
          '[]'::JSON
        ) AS translations,
        COALESCE(b.name, 'N/A') AS brand,
        COALESCE(c.id, 'unknown') AS category,
        COUNT(*) OVER()::INT AS total
      FROM products p
      LEFT JOIN product_translations pt ON pt."productId" = p.id
      LEFT JOIN brands b ON b.id = p."brandId"
      LEFT JOIN categories c ON c.id = p."categoryId"
      WHERE p.is_active = true
        AND p.stock <= p.minimum_stock_threshold
      GROUP BY p.id, b.id, c.id
      ORDER BY p.stock ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows;
  }

  /**
   * Get count of low-stock products without pagination
   */
  async getLowStockCount(): Promise<number> {
    const result = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*)::TEXT AS count
      FROM products
      WHERE is_active = true
        AND stock <= minimum_stock_threshold
    `;

    return Number(result[0]?.count || 0);
  }
}

export const stockAlertRepository = new StockAlertRepository();
