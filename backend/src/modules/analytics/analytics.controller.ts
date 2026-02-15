/**
 * Analytics Controller
 * Handles dashboard data requests for Super Admin
 */

import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { asyncHandler } from '@/common/utils/helpers';

class AnalyticsController {
  /**
   * GET /api/analytics/revenue/monthly
   */
  getRevenueMonthly = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AnalyticsService.getRevenueMonthly();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * GET /api/analytics/orders/monthly
   */
  getOrdersMonthly = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AnalyticsService.getOrdersMonthly();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * GET /api/analytics/products/by-category
   */
  getProductsByCategory = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AnalyticsService.getProductsByCategory();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * GET /api/analytics/users/growth
   */
  getUserGrowth = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AnalyticsService.getUserGrowth();
    res.status(200).json({
      success: true,
      data,
    });
  });

  /**
   * GET /api/analytics/overview
   */
  getOverview = asyncHandler(async (_req: Request, res: Response) => {
    const data = await AnalyticsService.getOverview();
    res.status(200).json({
      success: true,
      data,
    });
  });
}

export default new AnalyticsController();
