import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';

export class CategoryService {
  /**
   * Create a new category with translations
   */
  async create(data: { translations: any[] }) {
    return await prisma.category.create({
      data: {
        translations: {
          create: data.translations,
        },
      },
      include: {
        translations: true,
      },
    });
  }

  /**
   * List categories with translations
   */
  async list(locale?: string) {
    return await prisma.category.findMany({
      include: {
        translations: locale ? { where: { locale } } : true,
        _count: {
          select: { subcategories: true, products: true },
        },
      },
    });
  }

  /**
   * Get category by ID
   */
  async getById(id: string, locale?: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        translations: locale ? { where: { locale } } : true,
        subcategories: true,
      },
    });

    if (!category) {
      throw new ApiError('Category not found', 404);
    }

    return category;
  }

  /**
   * Update category
   */
  async update(id: string, data: { translations?: any[] }) {
    // Check if category exists
    await this.getById(id);

    return await prisma.category.update({
      where: { id },
      data: {
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

  /**
   * Delete category
   */
  async delete(id: string) {
    await this.getById(id);
    return await prisma.category.delete({
      where: { id },
    });
  }
}

export const categoryService = new CategoryService();
