import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { category_spec_templates } from '@prisma/client';
import crypto from 'crypto';

export class SpecTemplateService {
  async create(data: {
    categoryId: string;
    subcategoryId?: string | null;
    specKey: string;
    isRequired: boolean;
  }): Promise<category_spec_templates> {
    // Check if duplicate spec_key for this category/subcategory
    const existing = await prisma.category_spec_templates.findFirst({
      where: {
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId || null,
        spec_key: data.specKey,
      },
    });

    if (existing) {
      throw new ApiError('Specification template for this key already exists in this category', 400);
    }

    return await prisma.category_spec_templates.create({
      data: {
        id: crypto.randomUUID(), // id is required in schema and not @default(uuid())
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId || null,
        spec_key: data.specKey,
        is_required: data.isRequired,
        updated_at: new Date()
      },
    });
  }

  async getByCategory(categoryId: string, subcategoryId?: string | null): Promise<category_spec_templates[]> {
    return await prisma.category_spec_templates.findMany({
      where: {
        category_id: categoryId,
        OR: [
          { subcategory_id: subcategoryId || null },
          { subcategory_id: null }
        ]
      },
      orderBy: { spec_key: 'asc' }
    });
  }

  async delete(id: string): Promise<category_spec_templates> {
    return await prisma.category_spec_templates.delete({
      where: { id },
    });
  }

  async update(id: string, data: Partial<category_spec_templates>): Promise<category_spec_templates> {
    return await prisma.category_spec_templates.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      },
    });
  }
}

export const specTemplateService = new SpecTemplateService();
