/**
 * Notification Service
 * Handles business logic for system notifications
 */

import { prisma } from '@/config/database';
import { NotFoundError } from '@/common/errors/api.error';

class NotificationService {
  /**
   * Get all notifications with pagination
   */
  static async getNotifications(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.notification.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        total,
        page,
        totalPages,
      },
    };
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead() {
    return prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete all read notifications (Cleanup)
   */
  static async clearRead() {
    return prisma.notification.deleteMany({
      where: { isRead: true },
    });
  }

  /**
   * Get unread count
   */
  static async getUnreadCount() {
    const count = await prisma.notification.count({
      where: { isRead: false },
    });

    return { unreadCount: count };
  }
}

export { NotificationService };
