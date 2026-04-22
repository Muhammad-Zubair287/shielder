import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { warehouseService } from './warehouse.service';

export class WarehouseController {
  createWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await warehouseService.createWarehouse(req.body);
    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully.',
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

  updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const warehouse = await warehouseService.updateWarehouse(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Warehouse updated successfully.',
      data: warehouse,
    });
  });

  deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
    const result = await warehouseService.deleteWarehouse(req.params.id);
    res.json({
      success: true,
      message: 'Warehouse deleted successfully.',
      data: result,
    });
  });
}

export const warehouseController = new WarehouseController();
