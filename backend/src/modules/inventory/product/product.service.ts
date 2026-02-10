import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';

export class ProductService {
  async create(data: {
    categoryId: string;
    subcategoryId: string;
    price: number;
    stock: number;
    translations: any[];
  }) {
    return await prisma.product.create({
      data: {
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        price: data.price,
        stock: data.stock,
        translations: {
          create: data.translations,
        },
      },
      include: {
        translations: true,
        category: true,
        subcategory: true,
      },
    });
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
        price: data.price,
        stock: data.stock,
        translations: data.translations ? {
          deleteMany: {},
          create: data.translations,
        } : undefined,
      },
      include: {
        translations: true,
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
