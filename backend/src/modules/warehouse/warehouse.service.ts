import { BadRequestError, ConflictError, NotFoundError } from '@/common/errors/api.error';
import { warehouseRepository, WarehouseCreateInput, WarehouseUpdateInput } from './warehouse.repository';

export class WarehouseService {
  async createWarehouse(data: WarehouseCreateInput) {
    const name = data.name?.trim();
    const address = data.address?.trim();
    const city = data.city?.trim();
    const country = data.country?.trim();

    if (!name) throw new BadRequestError('Warehouse name is required.');
    if (!address) throw new BadRequestError('Warehouse address is required.');
    if (!city) throw new BadRequestError('Warehouse city is required.');
    if (!country) throw new BadRequestError('Warehouse country is required.');

    const existing = await warehouseRepository.findByName(name);
    if (existing) {
      throw new ConflictError('A warehouse with this name already exists.');
    }

    return warehouseRepository.create({
      name,
      address,
      city,
      country,
      isActive: data.isActive ?? true,
    });
  }

  getWarehouses() {
    return warehouseRepository.findAll();
  }

  async updateWarehouse(id: string, data: WarehouseUpdateInput) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Warehouse not found.');

    const payload: WarehouseUpdateInput = {};

    if (typeof data.name !== 'undefined') {
      const name = data.name.trim();
      if (!name) throw new BadRequestError('Warehouse name cannot be empty.');

      if (name.toLowerCase() !== warehouse.name.toLowerCase()) {
        const existing = await warehouseRepository.findByName(name);
        if (existing) {
          throw new ConflictError('A warehouse with this name already exists.');
        }
      }

      payload.name = name;
    }

    if (typeof data.address !== 'undefined') {
      const address = data.address.trim();
      if (!address) throw new BadRequestError('Warehouse address cannot be empty.');
      payload.address = address;
    }

    if (typeof data.city !== 'undefined') {
      const city = data.city.trim();
      if (!city) throw new BadRequestError('Warehouse city cannot be empty.');
      payload.city = city;
    }

    if (typeof data.country !== 'undefined') {
      const country = data.country.trim();
      if (!country) throw new BadRequestError('Warehouse country cannot be empty.');
      payload.country = country;
    }

    if (typeof data.isActive !== 'undefined') {
      payload.isActive = Boolean(data.isActive);
    }

    return warehouseRepository.update(id, payload);
  }

  async deleteWarehouse(id: string) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Warehouse not found.');

    await warehouseRepository.delete(id);

    return { id, deleted: true };
  }
}

export const warehouseService = new WarehouseService();
