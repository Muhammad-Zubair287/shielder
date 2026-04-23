import { BadRequestError, ConflictError, NotFoundError } from '@/common/errors/api.error';
import { warehouseRepository, WarehouseCreateInput, WarehouseUpdateInput } from './warehouse.repository';
import { prisma } from '@/config/database';
import { Prisma, OrderStatus } from '@prisma/client';

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

    if (data.isMain) {
      await warehouseRepository.unsetMainWarehouse();
    }

    const warehouse = await warehouseRepository.create({
      name,
      address,
      city,
      country,
      isMain: data.isMain ?? false,
      isActive: data.isActive ?? true,
    });

    return warehouse;
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

    if (typeof data.isMain !== 'undefined') {
      payload.isMain = Boolean(data.isMain);
    }

    if (payload.isMain) {
      await warehouseRepository.unsetMainWarehouse(id);
    }

    return warehouseRepository.update(id, payload);
  }

  async deleteWarehouse(id: string) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Warehouse not found.');

    if (warehouse.isMain) {
      throw new BadRequestError('Main warehouse cannot be deleted. Set another warehouse as main first.');
    }

    await warehouseRepository.delete(id);

    return { id, deleted: true };
  }

  async getWarehouseDetails(
    id: string,
    options?: {
      productSearch?: string;
      orderSearch?: string;
      orderStatus?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) throw new NotFoundError('Warehouse not found.');

    const page = Math.max(1, Number(options?.page || 1));
    const limit = Math.max(1, Math.min(50, Number(options?.limit || 10)));
    const skip = (page - 1) * limit;

    const productSearch = options?.productSearch?.trim();
    const orderSearch = options?.orderSearch?.trim();

    const productWhere: Prisma.ProductWhereInput = {
      warehouseId: id,
      ...(productSearch
        ? {
            OR: [
              { sku: { contains: productSearch, mode: 'insensitive' } },
              {
                translations: {
                  some: {
                    name: { contains: productSearch, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const orderWhere: Prisma.OrderWhereInput = {
      warehouseId: id,
      ...(options?.orderStatus ? { status: options.orderStatus as OrderStatus } : {}),
      ...(orderSearch
        ? {
            OR: [
              { orderNumber: { contains: orderSearch, mode: 'insensitive' } },
              { customerName: { contains: orderSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [productsTotal, ordersTotal, products, orders] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.order.count({ where: orderWhere }),
      prisma.product.findMany({
        where: productWhere,
        include: {
          translations: {
            where: { locale: 'en' },
            select: { name: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.findMany({
        where: orderWhere,
        include: {
          users: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
            },
          },
          _count: { select: { orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      warehouse,
      products,
      orders,
      pagination: {
        totalProducts: productsTotal,
        totalOrders: ordersTotal,
        page,
        limit,
        productPages: Math.ceil(productsTotal / limit),
        orderPages: Math.ceil(ordersTotal / limit),
      },
    };
  }
}

export const warehouseService = new WarehouseService();
