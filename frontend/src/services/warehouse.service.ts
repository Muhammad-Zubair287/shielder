import apiClient from './api.service';

export type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehousePayload = {
  name: string;
  address: string;
  city: string;
  country: string;
  isActive?: boolean;
};

class WarehouseService {
  async list() {
    const res = await apiClient.get('/admin/warehouses');
    return res.data;
  }

  async create(payload: WarehousePayload) {
    const res = await apiClient.post('/admin/warehouses', payload);
    return res.data;
  }

  async update(id: string, payload: Partial<WarehousePayload>) {
    const res = await apiClient.patch(`/admin/warehouses/${id}`, payload);
    return res.data;
  }

  async remove(id: string) {
    const res = await apiClient.delete(`/admin/warehouses/${id}`);
    return res.data;
  }
}

export const warehouseService = new WarehouseService();
