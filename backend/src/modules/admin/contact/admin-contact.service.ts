import { prisma } from '@/config/database';
import { NotFoundError } from '@/common/errors/api.error';

interface ContactListFilters {
  status?: 'PENDING' | 'RESOLVED';
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

class AdminContactService {
  async listContacts(filters: ContactListFilters) {
    const where: {
      status?: 'PENDING' | 'RESOLVED';
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          fileUrl: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  }

  async getInquiryStats() {
    const [pending, resolved] = await Promise.all([
      prisma.contact.count({ where: { status: 'PENDING' } }),
      prisma.contact.count({ where: { status: 'RESOLVED' } }),
    ]);

    return {
      pending,
      resolved,
      total: pending + resolved,
    };
  }

  async resolveContact(id: string, actorUserId: string) {
    const existing = await prisma.contact.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundError('Contact message not found');
    }

    const resolved = await prisma.contact.update({
      where: { id },
      data: { status: 'RESOLVED' },
      select: {
        id: true,
        status: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'CONTACT_RESOLVED',
        entityType: 'CONTACT',
        entityId: id,
      },
    });

    return resolved;
  }
}

export const adminContactService = new AdminContactService();
