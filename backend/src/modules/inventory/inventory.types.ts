import { Prisma } from '@prisma/client';

export type InventoryUpsertInput = {
  productId: string;
  warehouseId: string;
  quantity: number;
};

export type InventoryFilters = {
  productId?: string;
  warehouseId?: string;
  page: number;
  limit: number;
};

export type InventoryWhereInput = Prisma.InventoryWhereInput;
