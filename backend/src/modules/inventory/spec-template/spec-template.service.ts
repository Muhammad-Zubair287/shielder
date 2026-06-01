import { prisma } from '@/config/database';
import { BadRequestError, ConflictError } from '@/common/errors/api.error';
import { category_spec_templates } from '@prisma/client';
import crypto from 'crypto';

export class SpecTemplateService {
  async create(data: {
    categoryId: string;
    subcategoryId?: string | null;
    specKey: string;
    isRequired: boolean;
  }): Promise<category_spec_templates> {
    const categoryId = typeof data.categoryId === 'string' ? data.categoryId.trim() : '';
    const specKey = typeof data.specKey === 'string' ? data.specKey.trim() : '';
    const subcategoryId = typeof data.subcategoryId === 'string' ? data.subcategoryId.trim() || null : data.subcategoryId ?? null;

    if (!categoryId || !specKey || typeof data.isRequired !== 'boolean') {
      throw new BadRequestError('Required fields are missing');
    }

    // Check if duplicate spec_key for this category/subcategory
    const existing = await prisma.category_spec_templates.findFirst({
      where: {
        category_id: categoryId,
        subcategory_id: subcategoryId,
        spec_key: specKey,
      },
    });

    if (existing) {
      throw new ConflictError('Specification template for this key already exists in this category');
    }

    return await prisma.category_spec_templates.create({
      data: {
        id: crypto.randomUUID(), // id is required in schema and not @default(uuid())
        category_id: categoryId,
        subcategory_id: subcategoryId,
        spec_key: specKey,
        is_required: data.isRequired,
        updated_at: new Date(),
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
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestError('Required fields are missing');
    }

    return await prisma.category_spec_templates.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }
}

export const specTemplateService = new SpecTemplateService();
