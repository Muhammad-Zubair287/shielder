import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { PaginationParams, createPaginatedResponse } from '@/common/utils/pagination';

export interface SubcategoryFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export class SubcategoryService {
  /**
   * Create a new subcategory with translations.
   * Accepts either single-locale { name, locale } or bilingual { nameEn, nameAr }.
   */
  async create(
    data: {
      name?: string;
      description?: string;
      categoryId: string;
      image?: string;
      isActive?: boolean;
      nameEn?: string;
      descriptionEn?: string;
      nameAr?: string;
      descriptionAr?: string;
    },
    locale: string = 'en',
  ) {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new ApiError('Parent category not found', 404);
    }

    // Build translation entries
    const translationsToCreate: { name: string; description?: string; locale: string }[] = [];
    if (data.nameEn) translationsToCreate.push({ name: data.nameEn, description: data.descriptionEn, locale: 'en' });
    if (data.nameAr) translationsToCreate.push({ name: data.nameAr, description: data.descriptionAr, locale: 'ar' });
    if (translationsToCreate.length === 0 && data.name) {
      translationsToCreate.push({ name: data.name, description: data.description, locale });
    }
    if (translationsToCreate.length === 0) {
      throw new ApiError('Subcategory name is required', 400);
    }

    // Check for duplicate names in each locale
    for (const t of translationsToCreate) {
      const existing = await prisma.subcategoryTranslation.findFirst({
        where: {
          name: t.name,
          locale: t.locale,
          subcategory: { categoryId: data.categoryId },
        },
      });
      if (existing) {
        throw new ApiError(`Subcategory with this ${t.locale === 'ar' ? 'Arabic' : 'English'} name already exists in this category`, 400);
      }
    }

    return await prisma.subcategory.create({
      data: {
        categoryId: data.categoryId,
        image: data.image,
        isActive: data.isActive ?? true,
        translations: {
          create: translationsToCreate,
        },
      },
      include: {
        translations: true,
        category: {
          include: {
            translations: true,
          },
        },
      },
    });
  }

  /**
   * List subcategories with translations and pagination
   */
  async list(filters: SubcategoryFilters, pagination: PaginationParams, locale: string = 'en') {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.search) {
      where.translations = {
        some: {
          name: { contains: filters.search, mode: 'insensitive' },
          locale,
        },
      };
    }

    const [total, subcategories] = await Promise.all([
      prisma.subcategory.count({ where }),
      prisma.subcategory.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          translations: true, // all translations for bilingual forms
          category: {
            include: {
              translations: true,
            },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Flatten translations — expose locale name + bilingual fields
    const formattedSubcategories = subcategories.map((sub) => {
      const locTrans = sub.translations.find(t => t.locale === locale) || sub.translations[0];
      const enTrans = sub.translations.find(t => t.locale === 'en');
      const arTrans = sub.translations.find(t => t.locale === 'ar');
      const catLocTrans = sub.category.translations.find(t => t.locale === locale) || sub.category.translations[0];
      return {
        ...sub,
        name: locTrans?.name || '',
        description: locTrans?.description || '',
        nameEn: enTrans?.name || '',
        descriptionEn: enTrans?.description || '',
        nameAr: arTrans?.name || '',
        descriptionAr: arTrans?.description || '',
        categoryName: catLocTrans?.name || 'Unknown Category',
      };
    });

    return createPaginatedResponse(formattedSubcategories, total, pagination.page, pagination.limit);
  }

  /**
   * Get subcategory summary
   */
  async getSummary() {
    const [total, active, disabled] = await Promise.all([
      prisma.subcategory.count(),
      prisma.subcategory.count({ where: { isActive: true } }),
      prisma.subcategory.count({ where: { isActive: false } }),
    ]);

    return {
      totalSubcategories: total,
      activeSubcategories: active,
      disabledSubcategories: disabled,
    };
  }

  /**
   * Get single subcategory — returns ALL translations for admin bilingual form
   */
  async getById(id: string, locale: string = 'en') {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        translations: true,
        category: {
          include: {
            translations: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!subcategory) {
      throw new ApiError('Subcategory not found', 404);
    }

    const locTrans = subcategory.translations.find(t => t.locale === locale) || subcategory.translations[0];
    const enTrans = subcategory.translations.find(t => t.locale === 'en');
    const arTrans = subcategory.translations.find(t => t.locale === 'ar');
    const catEnTrans = subcategory.category.translations.find(t => t.locale === locale) || subcategory.category.translations[0];

    return {
      ...subcategory,
      name: locTrans?.name || '',
      description: locTrans?.description || '',
      nameEn: enTrans?.name || '',
      descriptionEn: enTrans?.description || '',
      nameAr: arTrans?.name || '',
      descriptionAr: arTrans?.description || '',
      categoryName: catEnTrans?.name || 'Unknown Category',
    };
  }

  /**
   * Update subcategory
   */
  /**
   * Update subcategory — accepts bilingual fields
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      categoryId?: string;
      image?: string;
      isActive?: boolean;
      nameEn?: string;
      descriptionEn?: string;
      nameAr?: string;
      descriptionAr?: string;
    },
    locale: string = 'en',
  ) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
    });

    if (!subcategory) {
      throw new ApiError('Subcategory not found', 404);
    }

    // Check if new category exists if provided
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new ApiError('Parent category not found', 404);
    }

    // Build translation upserts
    const upserts: { locale: string; name: string; description?: string }[] = [];
    if (data.nameEn !== undefined) upserts.push({ locale: 'en', name: data.nameEn, description: data.descriptionEn });
    if (data.nameAr !== undefined) upserts.push({ locale: 'ar', name: data.nameAr, description: data.descriptionAr });
    if (upserts.length === 0 && data.name !== undefined) {
      upserts.push({ locale, name: data.name, description: data.description });
    }

    if (upserts.length > 0) {
      await Promise.all(
        upserts.map(t =>
          prisma.subcategoryTranslation.upsert({
            where: { subcategoryId_locale: { subcategoryId: id, locale: t.locale } },
            update: { name: t.name, description: t.description },
            create: { subcategoryId: id, locale: t.locale, name: t.name, description: t.description },
          }),
        ),
      );
    }

    return await prisma.subcategory.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        image: data.image,
        isActive: data.isActive,
      },
      include: {
        translations: true,
      },
    });
  }

  /**
   * Delete subcategory
   */
  async delete(id: string) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!subcategory) {
      throw new ApiError('Subcategory not found', 404);
    }

    if (subcategory._count.products > 0) {
      throw new ApiError('Cannot delete subcategory that contains products', 400);
    }

    return await prisma.subcategory.delete({
      where: { id },
    });
  }

  async bulkDelete(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const deletedIds: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of uniqueIds) {
      const subcategory = await prisma.subcategory.findUnique({
        where: { id },
        include: {
          _count: { select: { products: true } },
        },
      });

      if (!subcategory) {
        failed.push({ id, error: 'Subcategory not found' });
        continue;
      }

      if (subcategory._count.products > 0) {
        failed.push({ id, error: 'Cannot delete subcategory that contains products' });
        continue;
      }

      await prisma.subcategory.delete({ where: { id } });
      deletedIds.push(id);
    }

    return {
      requestedCount: uniqueIds.length,
      deletedCount: deletedIds.length,
      deletedIds,
      failed,
    };
  }
}

export const subcategoryService = new SubcategoryService();
