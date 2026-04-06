import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { PaginationParams, createPaginatedResponse } from '@/common/utils/pagination';

export interface CategoryFilters {
  search?: string;
  isActive?: boolean;
}

export class CategoryService {
  /**
   * Create a new category with translations.
   * Accepts either:
   *  - { name, description, locale } — single-locale (backwards-compatible)
   *  - { nameEn, descriptionEn, nameAr, descriptionAr } — bilingual at once
   */
  async create(
    data: {
      name?: string;
      description?: string;
      image?: string;
      isActive?: boolean;
      nameEn?: string;
      descriptionEn?: string;
      nameAr?: string;
      descriptionAr?: string;
    },
    locale: string = 'en',
  ) {
    // Build translation entries to create
    const translationsToCreate: { name: string; description?: string; locale: string }[] = [];

    if (data.nameEn) {
      translationsToCreate.push({ name: data.nameEn, description: data.descriptionEn, locale: 'en' });
    }
    if (data.nameAr) {
      translationsToCreate.push({ name: data.nameAr, description: data.descriptionAr, locale: 'ar' });
    }
    // Fallback: single name + locale
    if (translationsToCreate.length === 0 && data.name) {
      translationsToCreate.push({ name: data.name, description: data.description, locale });
    }

    if (translationsToCreate.length === 0) {
      throw new ApiError('Category name is required', 400);
    }

    // Check for duplicate name in each target locale
    for (const t of translationsToCreate) {
      const existing = await prisma.categoryTranslation.findFirst({
        where: { name: t.name, locale: t.locale },
      });
      if (existing) {
        throw new ApiError(`Category with this ${t.locale === 'ar' ? 'Arabic' : 'English'} name already exists`, 400);
      }
    }

    return await prisma.category.create({
      data: {
        image: data.image,
        isActive: data.isActive ?? true,
        translations: {
          create: translationsToCreate,
        },
      },
      include: {
        translations: true,
      },
    });
  }

  /**
   * List categories with translations and pagination
   */
  async list(filters: CategoryFilters, pagination: PaginationParams, locale: string = 'en') {
    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.translations = {
        some: {
          name: { contains: filters.search, mode: 'insensitive' },
          locale,
        },
      };
    }

    const [total, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          translations: true, // Include ALL translations for bilingual admin forms
          _count: {
            select: { subcategories: true, products: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Flatten translations for the frontend — expose locale name + bilingual fields
    const formattedCategories = categories.map((cat) => {
      const locTrans = cat.translations.find(t => t.locale === locale) || cat.translations[0];
      const enTrans = cat.translations.find(t => t.locale === 'en');
      const arTrans = cat.translations.find(t => t.locale === 'ar');
      return {
        ...cat,
        name: locTrans?.name || '',
        description: locTrans?.description || '',
        nameEn: enTrans?.name || '',
        descriptionEn: enTrans?.description || '',
        nameAr: arTrans?.name || '',
        descriptionAr: arTrans?.description || '',
      };
    });

    return createPaginatedResponse(formattedCategories, total, pagination.page, pagination.limit);
  }

  /**
   * Get category summary
   */
  async getSummary() {
    const [total, active, disabled] = await Promise.all([
      prisma.category.count(),
      prisma.category.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: false } }),
    ]);

    return {
      totalCategories: total,
      activeCategories: active,
      disabledCategories: disabled,
    };
  }

  /**
   * Get category by ID — returns the requested locale name plus ALL translations for admin forms
   */
  async getById(id: string, locale: string = 'en') {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        translations: true, // Return ALL translations so admin can edit bilingual fields
        subcategories: {
          include: {
            translations: true,
            _count: {
              select: { products: true },
            },
            products: {
              include: {
                translations: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { subcategories: true, products: true },
        },
      },
    });

    if (!category) {
      throw new ApiError('Category not found', 404);
    }

    const localeTranslation = category.translations.find(t => t.locale === locale);
    const enTranslation = category.translations.find(t => t.locale === 'en');
    const arTranslation = category.translations.find(t => t.locale === 'ar');
    const formattedSubcategories = category.subcategories.map((sub) => {
      const subLocaleTranslation = sub.translations.find(t => t.locale === locale) || sub.translations[0];
      const subEnTranslation = sub.translations.find(t => t.locale === 'en');
      const subArTranslation = sub.translations.find(t => t.locale === 'ar');

      const formattedProducts = sub.products.map((product) => {
        const productLocaleTranslation = product.translations.find(t => t.locale === locale) || product.translations[0];
        const productEnTranslation = product.translations.find(t => t.locale === 'en');
        const productArTranslation = product.translations.find(t => t.locale === 'ar');

        return {
          ...product,
          name: productLocaleTranslation?.name || productEnTranslation?.name || '',
          description: productLocaleTranslation?.description || productEnTranslation?.description || '',
          nameEn: productEnTranslation?.name || '',
          descriptionEn: productEnTranslation?.description || '',
          nameAr: productArTranslation?.name || '',
          descriptionAr: productArTranslation?.description || '',
        };
      });

      return {
        ...sub,
        name: subLocaleTranslation?.name || subEnTranslation?.name || '',
        description: subLocaleTranslation?.description || subEnTranslation?.description || '',
        nameEn: subEnTranslation?.name || '',
        descriptionEn: subEnTranslation?.description || '',
        nameAr: subArTranslation?.name || '',
        descriptionAr: subArTranslation?.description || '',
        products: formattedProducts,
      };
    });

    return {
      ...category,
      // Convenience fields for current locale
      name: localeTranslation?.name || enTranslation?.name || '',
      description: localeTranslation?.description || enTranslation?.description || '',
      // Bilingual fields for admin forms
      nameEn: enTranslation?.name || '',
      descriptionEn: enTranslation?.description || '',
      nameAr: arTranslation?.name || '',
      descriptionAr: arTranslation?.description || '',
      subcategories: formattedSubcategories,
    };
  }

  /**
   * Update category — accepts single-locale or bilingual fields
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
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
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError('Category not found', 404);
    }

    // Build translation upserts
    const upserts: { locale: string; name: string; description?: string }[] = [];

    if (data.nameEn !== undefined) {
      upserts.push({ locale: 'en', name: data.nameEn, description: data.descriptionEn });
    }
    if (data.nameAr !== undefined) {
      upserts.push({ locale: 'ar', name: data.nameAr, description: data.descriptionAr });
    }
    // Fallback: single name + locale
    if (upserts.length === 0 && data.name !== undefined) {
      upserts.push({ locale, name: data.name, description: data.description });
    }

    // Check for duplicate names
    for (const t of upserts) {
      if (t.name) {
        const existing = await prisma.categoryTranslation.findFirst({
          where: { name: t.name, locale: t.locale, NOT: { categoryId: id } },
        });
        if (existing) {
          throw new ApiError(`Category with this ${t.locale === 'ar' ? 'Arabic' : 'English'} name already exists`, 400);
        }
      }
    }

    // Run upserts for each locale
    if (upserts.length > 0) {
      await Promise.all(
        upserts.map(t =>
          prisma.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: id, locale: t.locale } },
            create: { categoryId: id, locale: t.locale, name: t.name, description: t.description },
            update: { name: t.name, description: t.description },
          }),
        ),
      );
    }

    return await prisma.category.update({
      where: { id },
      data: {
        image: data.image,
        isActive: data.isActive,
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
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subcategories: true, products: true },
        },
      },
    });

    if (!category) {
      throw new ApiError('Category not found', 404);
    }

    if (category._count.subcategories > 0 || category._count.products > 0) {
      throw new ApiError('Cannot delete category with associated subcategories or products', 400);
    }

    return await prisma.category.delete({
      where: { id },
    });
  }

  async bulkDelete(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const deletedIds: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of uniqueIds) {
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { subcategories: true, products: true },
          },
        },
      });

      if (!category) {
        failed.push({ id, error: 'Category not found' });
        continue;
      }

      if (category._count.subcategories > 0 || category._count.products > 0) {
        failed.push({ id, error: 'Cannot delete category with associated subcategories or products' });
        continue;
      }

      await prisma.category.delete({ where: { id } });
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

export const categoryService = new CategoryService();

