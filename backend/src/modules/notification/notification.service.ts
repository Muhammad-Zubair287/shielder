/**
 * Notification Service
 * Handles business logic for system notifications
 */

import { prisma } from '@/config/database';
import { NotFoundError } from '@/common/errors/api.error';
import { NotificationType, UserRole, Prisma } from '@prisma/client';
import { emailService } from '@/common/services/email.service';

type NotificationMetadata = Prisma.InputJsonValue | null;

type NotificationTarget = {
  id: string;
  email: string;
  notificationPreferences: {
    inApp: boolean;
    email: boolean;
    lowStock: boolean;
    orderUpdates: boolean;
    payments: boolean;
    newUser: boolean;
  } | null;
};

type NotificationPreferencesUpdate = {
  inApp?: boolean;
  email?: boolean;
  lowStock?: boolean;
  orderUpdates?: boolean;
  payments?: boolean;
  newUser?: boolean;
};

type NotificationCreateData = Prisma.NotificationUncheckedCreateInput;

class NotificationService {
  /**
   * Main Notification Trigger
   * Sends both In-App and Email notifications based on user preferences
   */
  static async notify(params: {
    type: NotificationType;
    title: string;
    message: string;
    module: string;
    userId?: string;
    roleTarget?: UserRole;
    relatedId?: string;
    triggeredById?: string;
    triggeredBy?: string;
    metadata?: NotificationMetadata;
    sendEmail?: boolean;
    force?: boolean; // If true, skip duplicate check
    global?: boolean; // If true, notify all Super Admins
  }) {
    const { 
      type, 
      title, 
      message, 
      module,
      userId, 
      roleTarget, 
      relatedId, 
      triggeredById,
      triggeredBy = 'System',
      metadata, 
      sendEmail = true,
      force = false,
      global = false
    } = params;

    // 0. Check global notification settings from DB
    let globalEmailEnabled = true;
    let globalLowStockEnabled = true;
    let globalOrderStatusEnabled = true;
    let globalPaymentEnabled = true;
    try {
      const sysSettings = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
      if (sysSettings) {
        globalEmailEnabled = sysSettings.enableEmailNotifications ?? true;
        globalLowStockEnabled = sysSettings.enableLowStockAlerts ?? true;
        globalOrderStatusEnabled = sysSettings.enableOrderStatusNotifications ?? true;
        globalPaymentEnabled = sysSettings.enablePaymentNotifications ?? true;
      }
    } catch { /* silently ignore — fall back to enabled */ }

    // If low stock alerts are globally disabled, skip LOW_STOCK notifications entirely
    if (type === 'LOW_STOCK' && !globalLowStockEnabled) return;
    // If order status notifications are globally disabled, skip order-related types
    if (['ORDER_CREATED', 'ORDER_COMPLETED', 'REFUND_ISSUED'].includes(type) && !globalOrderStatusEnabled) return;
    // If payment notifications are globally disabled, skip payment-related types
    if (['PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED'].includes(type) && !globalPaymentEnabled) return;

    // 1. Identify Target Users
    let targets: NotificationTarget[] = [];
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { notificationPreferences: true }
      });
      if (user) targets.push(user);
    } else if (roleTarget || global) {
      const targetRole = global ? UserRole.SUPER_ADMIN : roleTarget;
      targets = await prisma.user.findMany({
        where: { 
          role: targetRole, 
          isActive: true,
          deletedAt: null
        },
        include: { notificationPreferences: true }
      });
    }

    // 2. Create In-App Notifications & Send Emails
    const notificationPromises = targets.map(async (user) => {
      // 2a. Duplicate Check (Audit & Protection Rule)
      if (!force && relatedId) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type,
            relatedId,
            deletedAt: null,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Same day
          }
        });
        if (existing) return; // Prevent duplicate spam
      }

      const prefs = user.notificationPreferences;
      
      // Check if user has preferences initialized
      if (!prefs) {
        // Initialize default preferences if missing
        await prisma.notificationPreference.create({
          data: { userId: user.id }
        });
      }

      const shouldReceiveInApp = !prefs || prefs.inApp;
      const shouldReceiveEmail = globalEmailEnabled && sendEmail && (!prefs || prefs.email);

      // Verify specific type toggle
      let typeEnabled = true;
      if (prefs) {
        if (type === 'LOW_STOCK') typeEnabled = prefs.lowStock;
        if (['ORDER_CREATED', 'ORDER_COMPLETED', 'REFUND_ISSUED'].includes(type)) typeEnabled = prefs.orderUpdates;
        if (['PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED'].includes(type)) typeEnabled = prefs.payments;
        if (type === 'NEW_USER_CREATED') typeEnabled = prefs.newUser;
      }

      if (typeEnabled) {
        // Create In-App Notification record
        if (shouldReceiveInApp) {
          await prisma.notification.create({
            data: {
              type,
              title,
              message,
              module,
              userId: user.id,
              roleTarget: roleTarget || null,
              relatedId,
              triggeredById,
              triggeredBy,
              metadata: metadata || Prisma.JsonNull,
            }
          });
        }

        // Send Email
        if (shouldReceiveEmail) {
          try {
            await emailService.sendEmail({
              to: user.email,
              subject: `[Shielder] ${title}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #1a1a1a;">${title}</h2>
                  <p style="color: #666; font-size: 16px;">${message}</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="font-size: 12px; color: #999;">You received this because of your notification settings at Shielder.</p>
                </div>
              `
            });
          } catch (error) {
            console.error('Failed to send notification email:', error);
          }
        }
      }
    });

    await Promise.all(notificationPromises);
  }

  /**
   * Get all notifications for a user with pagination
   * If global=true, fetch all (for Super Admin)
   */
  static async getNotifications(params: {
    userId?: string;
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
    module?: string;
    search?: string;
    global?: boolean;
  }) {
    const { 
      userId, 
      page = 1, 
      limit = 20, 
      read, 
      type, 
      module, 
      search, 
      global = false 
    } = params;
    
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      deletedAt: null
    };

    if (!global && userId) {
      where.userId = userId;
    }

    if (read !== undefined) where.isRead = read;
    if (type) where.type = type as NotificationType;
    if (module) where.module = module;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { triggeredBy: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { fullName: true } }
            }
          },
          triggerer: {
            select: {
              email: true,
              profile: { select: { fullName: true } }
            }
          }
        }
      }),
      prisma.notification.count({ where }),
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
   * Get Latest Notifications (for dropdown)
   */
  static async getLatest(userId: string, limit: number = 5) {
    return prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
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
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false, deletedAt: null },
      data: { isRead: true },
    });
  }

  /**
   * Delete a notification (Soft Delete)
   */
  static async deleteNotification(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get User Notification Preferences
   */
  static async getPreferences(userId: string) {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId }
      });
    }

    return prefs;
  }

  /**
   * Update User Notification Preferences
   */
  static async updatePreferences(userId: string, data: NotificationPreferencesUpdate) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data
    });
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    });
    return { count };
  }

  /**
   * Get Notification Stats (Super Admin)
   */
  static async getStats() {
    const [total, unread, lowStock, system] = await Promise.all([
      prisma.notification.count({ where: { deletedAt: null } }),
      prisma.notification.count({ where: { isRead: false, deletedAt: null } }),
      prisma.notification.count({ where: { type: 'LOW_STOCK', deletedAt: null } }),
      prisma.notification.count({ where: { type: 'SYSTEM_ALERT', deletedAt: null } }),
    ]);

    return { total, unread, lowStock, system };
  }

  /**
   * Simple create (for internal use, bypassing preferences)
   */
  static async createNotification(data: NotificationCreateData) {
    return prisma.notification.create({ data });
  }
}

export default NotificationService;
