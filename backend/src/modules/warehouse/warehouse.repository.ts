import { prisma } from '@/config/database';

export type WarehouseCreateInput = {
  name: string;
  address: string;
  city: string;
  country: string;
  isMain?: boolean;
  isActive?: boolean;
};

export type WarehouseUpdateInput = Partial<WarehouseCreateInput>;

export class WarehouseRepository {
  create(data: WarehouseCreateInput) {
    return prisma.warehouse.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        country: data.country,
        isMain: data.isMain ?? false,
        isActive: data.isActive ?? true,
      },
    });
  }

  findAll() {
    return prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return prisma.warehouse.findUnique({ where: { id } });
  }

  findByName(name: string) {
    return prisma.warehouse.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  async update(id: string, data: WarehouseUpdateInput) {
    return prisma.warehouse.update({
      where: { id },
      data,
    });
  }

  unsetMainWarehouse(exceptId?: string) {
    return prisma.warehouse.updateMany({
      where: exceptId ? { id: { not: exceptId }, isMain: true } : { isMain: true },
      data: { isMain: false },
    });
  }

  delete(id: string) {
    return prisma.warehouse.delete({ where: { id } });
  }
}

export const warehouseRepository = new WarehouseRepository();
