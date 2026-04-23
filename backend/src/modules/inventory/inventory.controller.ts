import { Request, Response } from 'express';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { BadRequestError } from '@/common/errors/api.error';
import { inventoryService } from './inventory.service';

export class InventoryController {
  upsertStock = asyncHandler(async (req: Request, res: Response) => {
    const { productId, warehouseId, quantity } = req.body as {
      productId?: string;
      warehouseId?: string;
      quantity?: number;
    };

    if (!productId) throw new BadRequestError('productId is required');
    if (!warehouseId) throw new BadRequestError('warehouseId is required');
    if (quantity === undefined || quantity === null) throw new BadRequestError('quantity is required');

    const inventory = await inventoryService.upsertStock(productId, warehouseId, Number(quantity));

    res.status(201).json({
      success: true,
      message: 'Inventory updated successfully.',
      data: inventory,
    });
  });

  getInventory = asyncHandler(async (req: Request, res: Response) => {
    const { productId, warehouseId, page = '1', limit = '20' } = req.query as {
      productId?: string;
      warehouseId?: string;
      page?: string;
      limit?: string;
    };

    const result = await inventoryService.getInventory({
      productId,
      warehouseId,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: result.pagination,
    });
  });
}

export const inventoryController = new InventoryController();
