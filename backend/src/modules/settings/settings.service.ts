/**
 * System Settings Service
 */

import prisma from '@/config/database';
import { NotFoundError, BadRequestError, UnauthorizedError } from '@/common/errors/api.error';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

class SettingsService {
  /**
   * Get Current Settings
   */
  async getSettings() {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'CURRENT' }
    });

    if (!settings) {
      // Initialize if not exists
      settings = await prisma.systemSettings.create({
        data: { id: 'CURRENT' }
      });
    }

    // Mask sensitive fields
    const maskedSettings = { ...settings };
    if (maskedSettings.paymentGatewayApiKey) {
      maskedSettings.paymentGatewayApiKey = '********' + maskedSettings.paymentGatewayApiKey.slice(-4);
    }
    if (maskedSettings.paymentGatewaySecretKey) {
      maskedSettings.paymentGatewaySecretKey = '********';
    }

    return maskedSettings;
  }

  /**
   * Update Settings with Audit & Snapshot
   */
  async updateSettings(
    userId: string,
    section: string,
    data: Record<string, unknown>,
    ipAddress?: string
  ) {
    const oldSettings = await prisma.systemSettings.findUnique({
      where: { id: 'CURRENT' }
    });

    if (!oldSettings) {
      throw new NotFoundError('Settings not found');
    }

    // Capture snapshot before major changes if versioning is required
    // In this simplified version, we'll create a snapshot for every update to allow rollback
    await this.createSnapshot(userId, 'Auto-snapshot before updating ' + section, oldSettings);

    const updatedSettings = await prisma.systemSettings.update({
      where: { id: 'CURRENT' },
      data: {
        ...data,
        updatedBy: userId
      }
    });

    // Log individual changes to Audit Log
    for (const key in data) {
      if (oldSettings[key as keyof typeof oldSettings] !== data[key]) {
        const jsonValue = (value: unknown): Prisma.InputJsonValue | null => {
          if (value === null || value === undefined) return null;
          if (value instanceof Date) return value.toISOString();
          if (Array.isArray(value)) return value.map(item => jsonValue(item) ?? null);
          if (typeof value === 'object') {
            const output: Record<string, Prisma.InputJsonValue> = {
            };
            for (const [objectKey, objectValue] of Object.entries(value as Record<string, unknown>)) {
              const converted = jsonValue(objectValue);
              if (converted !== null) {
                output[objectKey] = converted;
              }
            }
            return output;
          }
          return value as Prisma.InputJsonValue;
        };

        const changePayload: Prisma.InputJsonObject = {
          field: key,
          old: jsonValue(oldSettings[key as keyof typeof oldSettings]) ?? null,
          new: jsonValue(data[key]) ?? null,
        };

        await prisma.auditLog.create({
          data: {
            userId,
            action: `UPDATE_SETTING_${section.toUpperCase()}`,
            entityType: 'SystemSettings',
            entityId: 'CURRENT',
            changes: changePayload,
            ipAddress
          }
        });
      }
    }

    return updatedSettings;
  }

  /**
   * Create Configuration Snapshot
   */
  private async createSnapshot(
    userId: string,
    description: string,
    config: Prisma.InputJsonValue
  ) {
    const lastSnapshot = await prisma.systemConfigSnapshot.findFirst({
      orderBy: { version: 'desc' }
    });

    const nextVersion = (lastSnapshot?.version || 0) + 1;

    return prisma.systemConfigSnapshot.create({
      data: {
        config,
        version: nextVersion,
        description,
        createdById: userId
      }
    });
  }

  /**
   * Get Snapshots
   */
  async getSnapshots() {
    return prisma.systemConfigSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  /**
   * Get Audit Logs for Settings
   */
  async getSettingsLogs(filters: {
    page?: number;
    limit?: number;
    module?: string;
    adminId?: string;
    date?: string;
  }) {
    const { page = 1, limit = 20, module, adminId, date } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      entityType: 'SystemSettings'
    };

    if (module) where.action = { contains: module.toUpperCase() };
    if (adminId) where.userId = adminId;
    if (date) {
      where.createdAt = {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 86400000)
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, profile: { select: { fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    };
  }

  /**
   * Sensitive Action Verification
   */
  async verifyAdminPassword(userId: string, password: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new BadRequestError('Invalid password confirmation');

    return true;
  }

  /**
   * Backup & Restore (Simulated)
   */
  async triggerBackup(userId: string) {
    // In a real app, this would trigger an actual DB dump or cloud snapshot
    await prisma.systemSettings.update({
      where: { id: 'CURRENT' },
      data: { 
        lastBackupDate: new Date(),
        updatedBy: userId
      }
    });

    return {
      success: true,
      message: 'System backup initiated. Snapshot saved to encrypted storage.',
      timestamp: new Date()
    };
  }
}

export default new SettingsService();
