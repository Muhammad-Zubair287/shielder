import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { Prisma } from '@prisma/client';

export interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  specs?: Record<string, string[]>;
  sort?: string;
  page?: number;
  limit?: number;
  locale?: string;
}

export class ProductService {
  async create(data: {
    categoryId: string;
    subcategoryId: string;
    brandId?: string;
    price: number;
    stock: number;
    translations: any[];
  }) {
    const product = await prisma.product.create({
      data: {
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        brandId: data.brandId,
        price: data.price,
        stock: data.stock,
        status: 'PENDING',
        translations: {
          create: data.translations,
        },
      },
      include: {
        translations: true,
        category: true,
        subcategory: true,
        brand: true,
      },
    });

    // Trigger notification for Admin regarding new product approval
    try {
      const { NotificationService } = require('../../notification/notification.service');
      const { NotificationType, UserRole } = require('@prisma/client');
      
      const productName = data.translations.find((t: any) => t.locale === 'en')?.name || 'New Product';

      await NotificationService.createNotification({
        type: NotificationType.SYSTEM_ALERT,
        title: 'Product Pending Approval',
        message: `A new product "${productName}" has been created and requires approval.`,
        roleTarget: UserRole.ADMIN,
      });
    } catch (err) {
      console.error('Failed to create product approval notification:', err);
    }

    return product;
  }

  async filterProducts(filters: ProductFilters) {
    const {
      categoryId,
      subcategoryId,
      brandId,
      minPrice,
      maxPrice,
      inStock,
      specs,
      sort,
      page = 1,
      limit = 10,
      locale = 'en',
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      categoryId,
      subcategoryId,
      brandId,
    };

    const andConditions: Prisma.ProductWhereInput[] = [];

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        gte: minPrice,
        lte: maxPrice,
      };
    }

    // Stock
    if (inStock === true) {
      where.stock = { gt: 0 };
    } else if (inStock === false) {
      where.stock = 0;
    }

    // Dynamic Specs
    if (specs && Object.keys(specs).length > 0) {
      Object.entries(specs).forEach(([key, values]) => {
        andConditions.push({
          specifications: {
            some: {
              specification: { key },
              value: { in: values },
            },
          },
        });
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          translations: { where: { locale } },
          category: { include: { translations: { where: { locale } } } },
          subcategory: { include: { translations: { where: { locale } } } },
          brand: { include: { translations: { where: { locale } } } },
          specifications: {
            include: {
              specification: {
                include: { translations: { where: { locale } } },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Available Filters Logic
    // We calculate available filters based on basic category/subcategory selection
    // ignoring other specific filters like price, brand, and specs to let user see all options
    const baseWhere: Prisma.ProductWhereInput = {
      isActive: true,
      categoryId,
      subcategoryId,
    };

    const availableFilters = await this.getAvailableFilters(baseWhere, locale);

    return {
      products,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      availableFilters,
    };
  }

  private async getAvailableFilters(baseWhere: Prisma.ProductWhereInput, locale: string) {
    const priceRange = await prisma.product.aggregate({
      where: baseWhere,
      _min: { price: true },
      _max: { price: true },
    });

    const brands = await prisma.brand.findMany({
      where: {
        products: {
          some: baseWhere,
        },
      },
      include: {
        translations: { where: { locale } },
      },
    });

    const specsData = await prisma.productSpecification.findMany({
      where: {
        product: baseWhere,
      },
      include: {
        specification: {
          include: {
            translations: { where: { locale } },
          },
        },
      },
    });

    const specs: Record<string, { label: string; values: string[] }> = {};

    specsData.forEach((ps) => {
      const key = ps.specification.key;
      const label = ps.specification.translations[0]?.label || key;
      if (!specs[key]) {
        specs[key] = { label, values: [] };
      }
      if (!specs[key].values.includes(ps.value)) {
        specs[key].values.push(ps.value);
      }
    });

    return {
      brands,
      specs,
      priceRange: {
        min: priceRange._min.price,
        max: priceRange._max.price,
      },
    };
  }

  async list(filters: { categoryId?: string; subcategoryId?: string; locale?: string }) {
    return await prisma.product.findMany({
      where: {
        categoryId: filters.categoryId,
        subcategoryId: filters.subcategoryId,
      },
      include: {
        translations: filters.locale ? { where: { locale: filters.locale } } : true,
        category: true,
        subcategory: true,
      },
    });
  }

  async getById(id: string, locale?: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        translations: locale ? { where: { locale } } : true,
        category: true,
        subcategory: true,
        specifications: {
          include: {
            specification: {
              include: {
                translations: locale ? { where: { locale } } : true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    if (!product) throw new ApiError('Product not found', 404);
    return product;
  }

  async update(id: string, data: any) {
    await this.getById(id);

    return await prisma.product.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        brandId: data.brandId,
        price: data.price,
        stock: data.stock,
        isActive: data.isActive,
        translations: data.translations ? {
          deleteMany: {},
          create: data.translations,
        } : undefined,
      },
      include: {
        translations: true,
        brand: true,
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return await prisma.product.delete({ where: { id } });
  }

  // Specification methods
  async assignSpecifications(productId: string, specifications: any[]) {
    await this.getById(productId);

    // Delete existing and create new
    return await prisma.$transaction([
      prisma.productSpecification.deleteMany({ where: { productId } }),
      prisma.productSpecification.createMany({
        data: specifications.map(spec => ({
          productId,
          specificationId: spec.specificationId,
          value: spec.value,
        })),
      }),
    ]);
  }

  // Attachment methods
  async addAttachment(productId: string, attachmentData: any) {
    await this.getById(productId);

    return await prisma.productAttachment.create({
      data: {
        ...attachmentData,
        productId,
      },
    });
  }

  async listAttachments(productId: string) {
    await this.getById(productId);
    return await prisma.productAttachment.findMany({
      where: { productId },
    });
  }

  async getPendingProducts() {
    return await prisma.product.findMany({
      where: { status: 'PENDING' },
      include: {
        translations: true,
        category: { include: { translations: true } },
        subcategory: { include: { translations: true } },
      },
    });
  }

  async approveProduct(id: string) {
    const product = await this.getById(id);
    return await prisma.product.update({
      where: { id },
      data: { status: 'APPROVED', isActive: true },
    });
  }

  async rejectProduct(id: string) {
    const product = await this.getById(id);
    return await prisma.product.update({
      where: { id },
      data: { status: 'REJECTED', isActive: false },
    });
  }

  async deleteAttachment(productId: string, attachmentId: string) {
    const attachment = await prisma.productAttachment.findFirst({
      where: { id: attachmentId, productId },
    });

    if (!attachment) throw new ApiError('Attachment not found', 404);

    return await prisma.productAttachment.delete({
      where: { id: attachmentId },
    });
  }
}

export const productService = new ProductService();
