import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import type { InventoryUpsertInput, InventoryWhereInput } from './inventory.types';

type DB = Prisma.TransactionClient | typeof prisma;

export class InventoryRepository {
  findProductById(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, stock: true },
    });
  }

  findWarehouseById(warehouseId: string) {
    return prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, isActive: true },
    });
  }

  findMainWarehouseByName() {
    return prisma.warehouse.findFirst({
      where: {
        name: {
          equals: 'Main Warehouse',
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true, isActive: true },
    });
  }

  upsertStock(data: InventoryUpsertInput, db: DB = prisma) {
    return db.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: data.productId,
          warehouseId: data.warehouseId,
        },
      },
      create: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        reservedQuantity: 0,
      },
      update: {
        quantity: data.quantity,
        updated_at: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            translations: {
              where: { locale: 'en' },
              select: { name: true },
              take: 1,
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  findByProductWarehouse(productId: string, warehouseId: string, db: DB = prisma) {
    return db.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            translations: {
              where: { locale: 'en' },
              select: { name: true },
              take: 1,
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  list(where: InventoryWhereInput, skip: number, take: number) {
    return prisma.inventory.findMany({
      where,
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            translations: {
              where: { locale: 'en' },
              select: { name: true },
              take: 1,
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  count(where: InventoryWhereInput) {
    return prisma.inventory.count({ where });
  }

  async reserveStock(productId: string, warehouseId: string, quantity: number, db: DB = prisma) {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventories"
      SET
        "reserved_quantity" = "reserved_quantity" + ${quantity},
        "updated_at" = NOW()
      WHERE
        "product_id" = ${productId}::text
        AND "warehouse_id" = ${warehouseId}::uuid
        AND ("quantity" - "reserved_quantity") >= ${quantity}
      RETURNING "id"
    `;

    return rows[0] ?? null;
  }

  async releaseReservedStock(productId: string, warehouseId: string, quantity: number, db: DB = prisma) {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventories"
      SET
        "reserved_quantity" = "reserved_quantity" - ${quantity},
        "updated_at" = NOW()
      WHERE
        "product_id" = ${productId}::text
        AND "warehouse_id" = ${warehouseId}::uuid
        AND "reserved_quantity" >= ${quantity}
      RETURNING "id"
    `;

    return rows[0] ?? null;
  }

  async consumeReservedStock(productId: string, warehouseId: string, quantity: number, db: DB = prisma) {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventories"
      SET
        "quantity" = "quantity" - ${quantity},
        "reserved_quantity" = "reserved_quantity" - ${quantity},
        "updated_at" = NOW()
      WHERE
        "product_id" = ${productId}::text
        AND "warehouse_id" = ${warehouseId}::uuid
        AND "reserved_quantity" >= ${quantity}
        AND "quantity" >= ${quantity}
      RETURNING "id"
    `;

    return rows[0] ?? null;
  }

  async reduceStock(productId: string, warehouseId: string, quantity: number, db: DB = prisma) {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventories"
      SET
        "quantity" = "quantity" - ${quantity},
        "updated_at" = NOW()
      WHERE
        "product_id" = ${productId}::text
        AND "warehouse_id" = ${warehouseId}::uuid
        AND ("quantity" - "reserved_quantity") >= ${quantity}
      RETURNING "id"
    `;

    return rows[0] ?? null;
  }

  async increaseStock(productId: string, warehouseId: string, quantity: number, db: DB = prisma) {
    // Use atomic increment to avoid race conditions
    // Try update first; if not found, create new record
    try {
      return await db.inventory.update({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
        data: {
          quantity: {
            increment: quantity,
          },
          updated_at: new Date(),
        },
      });
    } catch (err: any) {
      // If record doesn't exist (P2025), create it
      if (err.code === 'P2025') {
        return db.inventory.create({
          data: {
            productId,
            warehouseId,
            quantity,
            reservedQuantity: 0,
          },
        });
      }
      throw err;
    }
  }

  async reduceStock(productId: string, warehouseId: string, quantity: number, db: DB = prisma) {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventories"
      SET
        "quantity" = "quantity" - ${quantity},
        "updated_at" = NOW()
      WHERE
        "product_id" = ${productId}::text
        AND "warehouse_id" = ${warehouseId}::uuid
        AND "quantity" >= ${quantity}
      RETURNING "id"
    `;

    return rows[0] ?? null;
  }
}

export const inventoryRepository = new InventoryRepository();
