import { prisma } from '@/config/database';

export class CustomerQuotationRepository {
  findByIdWithItems(id: string) {
    return prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                translations: true,
                attachments: { where: { type: 'IMAGE' }, take: 1 },
              },
            },
          },
        },
      },
    });
  }
}

export const customerQuotationRepository = new CustomerQuotationRepository();
