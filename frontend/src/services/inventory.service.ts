import apiClient from './api.service';

export type InventoryProduct = {
  id: string;
  sku?: string;
  name?: string;
  translations?: Array<{ name?: string }>;
};

export type InventoryWarehouse = {
  id: string;
  name: string;
  city?: string;
  country?: string;
};

export type InventoryRecord = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt: string;
  product?: InventoryProduct;
  warehouse?: InventoryWarehouse;
};

export type InventoryListParams = {
  page?: number;
  limit?: number;
  productId?: string;
  warehouseId?: string;
};

export type InventoryUpsertPayload = {
  productId: string;
  warehouseId: string;
  quantity: number;
};

class InventoryService {
  async list(params?: InventoryListParams) {
    const response = await apiClient.get('admin/inventory', { params });
    return response.data;
  }

  async upsert(payload: InventoryUpsertPayload) {
    const response = await apiClient.post('admin/inventory', payload);
    return response.data;
  }
}

export const inventoryService = new InventoryService();
