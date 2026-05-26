/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Inventory Alert Controller
 * Handles HTTP requests for inventory alert operations
 */

import { Response } from 'express';
import { AuthRequest } from '@/types/global';
import { InventoryAlertService } from './inventory-alert.service';
import { asyncHandler } from '@/common/utils/helpers';

export class InventoryAlertController {
  /**
   * Create an inventory alert (Admin/Super Admin only)
   */
  static createAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId, threshold } = req.body;

    const alert = await InventoryAlertService.createAlert(productId, threshold);

    res.status(201).json({
      success: true,
      message: 'Inventory alert created successfully',
      data: { alert },
    });
  });

  /**
   * List inventory alerts
   */
  static listAlerts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, page = 1, limit = 10 } = req.query;

    const result = await InventoryAlertService.listAlerts(
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * Update an inventory alert
   */
  static updateAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { threshold, status } = req.body;

    const alert = await InventoryAlertService.updateAlert(id, threshold, status);

    res.status(200).json({
      success: true,
      message: 'Inventory alert updated successfully',
      data: { alert },
    });
  });

  /**
   * Delete an inventory alert
   */
  static deleteAlert = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await InventoryAlertService.deleteAlert(id);

    res.status(200).json({
      success: true,
      message: 'Inventory alert deleted successfully',
    });
  });

  /**
   * Manually trigger alert checks
   */
  static triggerAlertChecks = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const triggered = await InventoryAlertService.checkAndTriggerAlerts();

    res.status(200).json({
      success: true,
      message: `Alert check completed. ${triggered.length} alerts triggered.`,
      data: { triggeredCount: triggered.length },
    });
  });
}
