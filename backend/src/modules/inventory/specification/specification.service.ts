import { prisma } from '@/config/database';
import { ApiError } from '@/common/errors/api.error';
import { DataType } from '@prisma/client';

export class SpecificationService {
  async createDefinition(data: {
    key: string;
    unit?: string;
    dataType: DataType;
    translations: any[];
  }) {
    // Check if key exists
    const existing = await prisma.specificationDefinition.findUnique({
      where: { key: data.key },
    });
    if (existing) throw new ApiError('Specification key already exists', 400);

    return await prisma.specificationDefinition.create({
      data: {
        key: data.key,
        unit: data.unit,
        dataType: data.dataType,
        translations: {
          create: data.translations,
        },
      },
      include: {
        translations: true,
      },
    });
  }

  async listDefinitions(locale?: string) {
    return await prisma.specificationDefinition.findMany({
      include: {
        translations: locale ? { where: { locale } } : true,
      },
    });
  }

  async getDefinitionById(id: string, locale?: string) {
    const definition = await prisma.specificationDefinition.findUnique({
      where: { id },
      include: {
        translations: locale ? { where: { locale } } : true,
      },
    });

    if (!definition) throw new ApiError('Specification definition not found', 404);
    return definition;
  }

  async bulkCreateDefinitions(data: { specifications: any[] }) {
    return await prisma.$transaction(async (tx) => {
      const results = [];
      for (const spec of data.specifications) {
        // Skip if key already exists or handle error
        const existing = await tx.specificationDefinition.findUnique({
          where: { key: spec.key },
        });

        if (!existing) {
          const created = await tx.specificationDefinition.create({
            data: {
              key: spec.key,
              unit: spec.unit,
              dataType: spec.dataType,
              translations: {
                create: spec.translations,
              },
            },
            include: {
              translations: true,
            },
          });
          results.push(created);
        } else {
          results.push(existing); // Return existing if already there
        }
      }
      return results;
    });
  }
}

export const specificationService = new SpecificationService();
