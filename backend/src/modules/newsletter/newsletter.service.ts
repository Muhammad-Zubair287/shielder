import { prisma } from '@/config/database';
import { ConflictError } from '@/common/errors/api.error';
import { AuditService } from '@/common/services/audit.service';

export class NewsletterService {
  async subscribe(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, active: true },
    });

    if (existing?.active) {
      throw new ConflictError('Email is already subscribed');
    }

    let subscription;
    if (existing && !existing.active) {
      subscription = await prisma.newsletterSubscription.update({
        where: { email: normalizedEmail },
        data: {
          active: true,
          subscribedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          active: true,
          subscribedAt: true,
        },
      });
    } else {
      subscription = await prisma.newsletterSubscription.create({
        data: {
          email: normalizedEmail,
          active: true,
        },
        select: {
          id: true,
          email: true,
          active: true,
          subscribedAt: true,
        },
      });
    }

    await AuditService.log({
      action: 'NEWSLETTER_SUBSCRIBED',
      entityType: 'NEWSLETTER_SUBSCRIPTION',
      entityId: subscription.id,
      changes: {
        email: subscription.email,
      },
    });

    return subscription;
  }

  async list(params: { page: number; limit: number; active?: boolean }) {
    const { page, limit, active } = params;
    const skip = (page - 1) * limit;

    const where = typeof active === 'boolean' ? { active } : {};

    const [rows, total] = await Promise.all([
      prisma.newsletterSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
        select: {
          id: true,
          email: true,
          active: true,
          subscribedAt: true,
        },
      }),
      prisma.newsletterSubscription.count({ where }),
    ]);

    return {
      subscribers: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const newsletterService = new NewsletterService();
