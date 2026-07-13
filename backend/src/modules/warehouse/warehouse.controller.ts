/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { warehouseService } from './warehouse.service';
import { t } from '@/common/i18n';

export class WarehouseController {
  createWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await warehouseService.createWarehouse(req.body);
    res.status(201).json({
      success: true,
      message: t('warehouse.createSuccess', req.locale),
      data: warehouse,
    });
  });

  getWarehouses = asyncHandler(async (_req: Request, res: Response) => {
    const warehouses = await warehouseService.getWarehouses();
    res.json({
      success: true,
      data: warehouses,
    });
  });

  getActiveWarehouses = asyncHandler(async (_req: Request, res: Response) => {
    const warehouses = await warehouseService.getWarehouses();
    res.json({
      success: true,
      data: warehouses.filter((warehouse) => warehouse.isActive),
    });
  });

  getWarehouseById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { productSearch, orderSearch, orderStatus, page, limit } = req.query as Record<string, string | undefined>;

    const data = await warehouseService.getWarehouseDetails(id, {
      productSearch,
      orderSearch,
      orderStatus,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });

    res.json({
      success: true,
      data,
    });
  });

  updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const warehouse = await warehouseService.updateWarehouse(id, req.body);
    res.json({
      success: true,
      message: t('warehouse.updateSuccess', req.locale),
      data: warehouse,
    });
  });

  deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await warehouseService.deleteWarehouse(id);
    res.json({
      success: true,
      message: t('warehouse.deleteSuccess', req.locale),
      data: result,
    });
  });
}

export const warehouseController = new WarehouseController();
