import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';

export class OrderRepository {
  findByIdWithDetails(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            name: true,
            address: true,
            city: true,
            country: true,
          },
        },
        orderItems: {
          include: {
            product: {
              include: {
                translations: true,
                specifications: true,
                attachments: {
                  select: { fileUrl: true },
                  take: 5,
                },
              },
            },
          },
        },
        users: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  list(where: Prisma.OrderWhereInput, skip: number, limit: number, orderBy: Prisma.OrderOrderByWithRelationInput) {
    return prisma.order.findMany({
      where,
      include: {
        warehouse: {
          select: {
            name: true,
            address: true,
            city: true,
            country: true,
          },
        },
        users: {
          select: {
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
        _count: {
          select: { orderItems: true },
        },
      },
      skip,
      take: limit,
      orderBy,
    });
  }

  count(where: Prisma.OrderWhereInput) {
    return prisma.order.count({ where });
  }
}

export const orderRepository = new OrderRepository();
