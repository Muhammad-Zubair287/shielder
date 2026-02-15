/**
 * Stock Alert Controller
 * Handles HTTP requests for low stock alerts
 */

import { Request, Response } from 'express';
import { StockAlertService } from './stock-alert.service';
import { asyncHandler } from '@/common/utils/helpers';

class StockAlertController {
  /**
   * GET /api/products/low-stock
   */
  getLowStockProducts = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await StockAlertService.getLowStockProducts(page, limit);

    res.status(200).json({
      success: true,
      message: 'Low stock products retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/products/low-stock/count
   */
  getLowStockCount = asyncHandler(async (_req: Request, res: Response) => {
    const result = await StockAlertService.getLowStockCount();

    res.status(200).json({
      success: true,
      message: 'Low stock count retrieved successfully',
      data: result,
    });
  });

  /**
   * PATCH /api/products/:id/stock
   */
  updateStock = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { stock } = req.body;

    const updatedProduct = await StockAlertService.updateStock(id, stock);

    res.status(200).json({
      success: true,
      message: 'Product stock updated successfully',
      data: updatedProduct,
    });
  });

  /**
   * PATCH /api/products/:id/threshold
   */
  updateThreshold = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { threshold } = req.body;

    const updatedProduct = await StockAlertService.updateThreshold(id, threshold);

    res.status(200).json({
      success: true,
      message: 'Product minimum stock threshold updated successfully',
      data: updatedProduct,
    });
  });
}

export default new StockAlertController();
