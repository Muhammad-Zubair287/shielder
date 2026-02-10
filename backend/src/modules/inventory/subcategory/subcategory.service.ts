import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';

export class SubcategoryService {
  async create(data: { categoryId: string; translations: any[] }) {
    // Check if category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new ApiError('Parent category not found', 404);

    return await prisma.subcategory.create({
      data: {
        categoryId: data.categoryId,
        translations: {
          create: data.translations,
        },
      },
      include: {
        translations: true,
      },
    });
  }

  async list(categoryId?: string, locale?: string) {
    return await prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        translations: locale ? { where: { locale } } : true,
        category: true,
      },
    });
  }

  async getById(id: string, locale?: string) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        translations: locale ? { where: { locale } } : true,
        category: true,
      },
    });

    if (!subcategory) throw new ApiError('Subcategory not found', 404);
    return subcategory;
  }

  async update(id: string, data: { categoryId?: string; translations?: any[] }) {
    await this.getById(id);

    return await prisma.subcategory.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
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
    return await prisma.subcategory.delete({ where: { id } });
  }
}

export const subcategoryService = new SubcategoryService();
