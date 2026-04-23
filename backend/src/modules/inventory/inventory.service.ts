import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { inventoryRepository } from './inventory.repository';
import type { InventoryFilters } from './inventory.types';

type DB = Prisma.TransactionClient;

export class InventoryService {
  private normalizeQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) {
      throw new BadRequestError('Quantity must be a valid number');
    }

    return Math.max(0, Math.trunc(quantity));
  }

  async resolveMainWarehouseId(): Promise<string> {
    const envWarehouseId = process.env.MAIN_WAREHOUSE_ID?.trim();

    if (envWarehouseId) {
      const warehouse = await inventoryRepository.findWarehouseById(envWarehouseId);
      if (warehouse && warehouse.isActive) {
        return warehouse.id;
      }
    }

    const mainWarehouse = await inventoryRepository.findMainWarehouseByName();
    if (!mainWarehouse) {
      throw new NotFoundError('Main Warehouse not found');
    }

    if (!mainWarehouse.isActive) {
      throw new BadRequestError('Main Warehouse is inactive');
    }

    return mainWarehouse.id;
  }

  async resolveWarehouseForOrder(
    deliveryType: 'DELIVERY' | 'PICKUP',
    pickupWarehouseId?: string,
  ): Promise<string> {
    if (deliveryType === 'PICKUP') {
      if (!pickupWarehouseId) {
        throw new BadRequestError('warehouseId is required for PICKUP delivery type');
      }

      const warehouse = await inventoryRepository.findWarehouseById(pickupWarehouseId);
      if (!warehouse) {
        throw new NotFoundError(`Warehouse with ID ${pickupWarehouseId} not found`);
      }

      if (!warehouse.isActive) {
        throw new BadRequestError(`Warehouse "${warehouse.name}" is not active`);
      }

      return warehouse.id;
    }

    return this.resolveMainWarehouseId();
  }

  async upsertStock(productId: string, warehouseId: string, quantity: number) {
    const normalizedQuantity = this.normalizeQuantity(quantity);

    const [product, warehouse, existingInventory] = await Promise.all([
      inventoryRepository.findProductById(productId),
      inventoryRepository.findWarehouseById(warehouseId),
      inventoryRepository.findByProductWarehouse(productId, warehouseId),
    ]);

    if (!product) {
      throw new NotFoundError(`Product with ID ${productId} not found`);
    }

    if (!warehouse) {
      throw new NotFoundError(`Warehouse with ID ${warehouseId} not found`);
    }

    if (existingInventory && normalizedQuantity < existingInventory.reservedQuantity) {
      throw new BadRequestError(
        `Quantity cannot be less than reserved stock (${existingInventory.reservedQuantity})`,
      );
    }

    return inventoryRepository.upsertStock({
      productId,
      warehouseId,
      quantity: normalizedQuantity,
    });
  }

  async getInventory(filters: InventoryFilters) {
    const page = Number.isFinite(filters.page) ? Math.max(1, Math.trunc(filters.page)) : 1;
    const limit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(100, Math.trunc(filters.limit))) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {};
    if (filters.productId) where.productId = filters.productId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    const [total, rows] = await Promise.all([
      inventoryRepository.count(where),
      inventoryRepository.list(where, skip, limit),
    ]);

    return {
      rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async reduceStock(productId: string, warehouseId: string, quantity: number, db?: DB) {
    const normalizedQuantity = this.normalizeQuantity(quantity);
    if (normalizedQuantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    const updated = await inventoryRepository.reduceStock(productId, warehouseId, normalizedQuantity, db);
    if (!updated) {
      throw new BadRequestError('Insufficient stock');
    }

    return updated;
  }

  async reserveStock(productId: string, warehouseId: string, quantity: number, db?: DB) {
    const normalizedQuantity = this.normalizeQuantity(quantity);
    if (normalizedQuantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    const updated = await inventoryRepository.reserveStock(productId, warehouseId, normalizedQuantity, db);
    if (!updated) {
      throw new BadRequestError('Insufficient stock');
    }

    return updated;
  }

  async releaseReservedStock(productId: string, warehouseId: string, quantity: number, db?: DB) {
    const normalizedQuantity = this.normalizeQuantity(quantity);
    if (normalizedQuantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    const updated = await inventoryRepository.releaseReservedStock(productId, warehouseId, normalizedQuantity, db);
    if (!updated) {
      throw new BadRequestError('Unable to release reserved stock');
    }

    return updated;
  }

  async consumeReservedStock(productId: string, warehouseId: string, quantity: number, db?: DB) {
    const normalizedQuantity = this.normalizeQuantity(quantity);
    if (normalizedQuantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    const updated = await inventoryRepository.consumeReservedStock(productId, warehouseId, normalizedQuantity, db);
    if (!updated) {
      throw new BadRequestError('Insufficient stock');
    }

    return updated;
  }

  async increaseStock(productId: string, warehouseId: string, quantity: number, db?: DB) {
    const normalizedQuantity = this.normalizeQuantity(quantity);
    if (normalizedQuantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    const inventory = await inventoryRepository.findByProductWarehouse(productId, warehouseId, db);
    if (!inventory) {
      throw new NotFoundError('Inventory record not found');
    }

    return inventoryRepository.increaseStock(productId, warehouseId, normalizedQuantity, db);
  }
}

export const inventoryService = new InventoryService();
