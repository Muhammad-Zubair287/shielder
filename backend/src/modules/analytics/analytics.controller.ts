/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Analytics Controller
 * Handles dashboard data requests for Super Admin
 */

import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { asyncHandler } from '@/common/utils/helpers';

const setDashboardCacheHeaders = (res: Response) => {
  res.setHeader('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
};

class AnalyticsController {
  /**
   * @swagger
   * /api/analytics/revenue/monthly:
   *   get:
   *     summary: Revenue trends for the last 12 months
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Monthly revenue data
   */
  getRevenueMonthly = asyncHandler(async (_req: Request, res: Response) => {
    setDashboardCacheHeaders(res);
    const data = await AnalyticsService.getRevenueMonthly();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * @swagger
   * /api/analytics/orders/monthly:
   *   get:
   *     summary: Order volume trends for the last 12 months
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Monthly order count data
   */
  getOrdersMonthly = asyncHandler(async (_req: Request, res: Response) => {
    setDashboardCacheHeaders(res);
    const data = await AnalyticsService.getOrdersMonthly();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * @swagger
   * /api/analytics/products/by-category:
   *   get:
   *     summary: Inventory distribution by category
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Products grouped by category
   */
  getProductsByCategory = asyncHandler(async (_req: Request, res: Response) => {
    setDashboardCacheHeaders(res);
    const data = await AnalyticsService.getProductsByCategory();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * @swagger
   * /api/analytics/users/growth:
   *   get:
   *     summary: New user acquisition trends
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: User growth data
   */
  getUserGrowth = asyncHandler(async (_req: Request, res: Response) => {
    setDashboardCacheHeaders(res);
    const data = await AnalyticsService.getUserGrowth();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * @swagger
   * /api/analytics/overview:
   *   get:
   *     summary: Real-time summary of platform performance
   *     tags: [Analytics]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Overview metrics
   */
  getOverview = asyncHandler(async (_req: Request, res: Response) => {
    setDashboardCacheHeaders(res);
    const data = await AnalyticsService.getOverview();
    res.status(200).json({
      success: true,
      data,
    });
  });
}

export default new AnalyticsController();
