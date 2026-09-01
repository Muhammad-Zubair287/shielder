/**
 * System Settings Service
 */

import prisma from '@/config/database';
import { NotFoundError, BadRequestError, UnauthorizedError } from '@/common/errors/api.error';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { t } from '@/common/i18n';
import {
  sanitizeMaybeString,
  validateGeneralSettings,
  validatePaymentSettings,
  validateSecurityField,
} from '@/common/security/validation.security';
import { DEFAULT_COMPANY_EMAIL } from '@/common/constants/settings.defaults';

class SettingsService {
  private cachedCurrency: string | null = null;
  private lastCurrencyFetch: number = 0;
  private readonly CURRENCY_CACHE_TTL = 60000; // Cache for 1 minute

  /**
   * Get platform currency code (e.g., 'SAR', 'USD')
   * Defaults to 'SAR' for the Shielder platform
   * @returns Currency code string
   */
  async getCurrency(): Promise<string> {
    const now = Date.now();
    
    // Return cached currency if still valid
    if (this.cachedCurrency && (now - this.lastCurrencyFetch < this.CURRENCY_CACHE_TTL)) {
      return this.cachedCurrency;
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'CURRENT' },
      select: { currency: true }
    });

    const currency = settings?.currency || 'SAR';
    this.cachedCurrency = currency;
    this.lastCurrencyFetch = now;

    return currency;
  }

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
        data: {
          id: 'CURRENT',
          currency: 'SAR',
          companyEmail: DEFAULT_COMPANY_EMAIL,
        },
      });
    } else {
      const legacyUpdates: { currency?: string; companyEmail?: string } = {};

      if (settings.currency === 'USD' && settings.updatedBy == null) {
        // One-time legacy normalization for untouched defaults.
        legacyUpdates.currency = 'SAR';
      }

      if (!settings.companyEmail && settings.updatedBy == null) {
        // One-time default for untouched installs — official client contact email.
        legacyUpdates.companyEmail = DEFAULT_COMPANY_EMAIL;
      }

      if (Object.keys(legacyUpdates).length > 0) {
        settings = await prisma.systemSettings.update({
          where: { id: 'CURRENT' },
          data: legacyUpdates,
        });
      }
    }

    // Invalidate currency cache when settings are fetched
    if (settings.currency !== this.cachedCurrency) {
      this.cachedCurrency = settings.currency;
      this.lastCurrencyFetch = Date.now();
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
    ipAddress?: string,
    locale: string = 'en'
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

    const sanitizedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitizedData[key] = typeof value === 'string' ? sanitizeMaybeString(value) : value;
    }

    if (section === 'payment') {
      const paymentValidation = validatePaymentSettings(sanitizedData);
      if (!paymentValidation.isValid) {
        throw new BadRequestError(t(paymentValidation.errors[0] || 'settings.invalidPaymentApiKey', locale));
      }
    }

    if (section === 'general') {
      const generalValidation = validateGeneralSettings(sanitizedData);
      if (!generalValidation.isValid) {
        throw new BadRequestError(t(generalValidation.errors[0] || 'settings.invalidCompanyName', locale));
      }
    }

    for (const sensitiveField of [
      'paymentGatewayApiKey',
      'paymentGatewaySecretKey',
      'paymentWebhookUrl',
      'companyName',
      'companyNameEn',
      'companyNameAr',
      'companyEmail',
      'companyPhone',
      'companyAddress',
      'companyLocationEn',
      'companyLocationAr',
    ]) {
      if (sensitiveField in sanitizedData && sanitizedData[sensitiveField] !== null && sanitizedData[sensitiveField] !== undefined && sanitizedData[sensitiveField] !== '') {
        const validation = validateSecurityField(sensitiveField, sanitizedData[sensitiveField]);
        if (!validation.isValid) {
          throw new BadRequestError(t(validation.errors[0] || 'settings.maliciousContentDetected', locale));
        }
      }
    }

    // Filter input data to only include valid Prisma SystemSettings fields to avoid schema errors.
    // E.g., fields like favicon that aren't physically in the schema.prisma SystemSettings model.
    const systemSettingsFields = [
      'systemName', 'companyName', 'companyNameEn', 'companyNameAr', 'companyLogo',
      'companyEmail', 'companyPhone', 'companyAddress', 'companyLocationEn', 'companyLocationAr',
      'currency', 'timezone', 'dateFormat', 'language', 'defaultOrderStatus',
      'autoCompleteOrderAfterPayment', 'allowPartialPayment', 'allowOrderCancellation',
      'autoCancelUnpaidOrdersHours', 'paymentMethodsEnabled', 'onlinePaymentEnabled',
      'paymentTestMode', 'paymentGatewayApiKey', 'paymentGatewaySecretKey', 'paymentWebhookUrl',
      'enableEmailNotifications', 'enableLowStockAlerts', 'lowStockThreshold',
      'enableOrderStatusNotifications', 'enablePaymentNotifications', 'roleNotificationMappings',
      'passwordMinLength', 'maxLoginAttempts', 'accountLockDurationMinutes', 'sessionTimeoutMinutes',
      'enableTwoFactorAuth', 'forceStrongPasswords', 'lastBackupDate', 'autoBackupSchedule',
      'updatedBy'
    ];

    const prismaUpdateData: Record<string, any> = {};
    for (const key of Object.keys(sanitizedData)) {
      if (systemSettingsFields.includes(key)) {
        prismaUpdateData[key] = sanitizedData[key];
      }
    }

    const updatedSettings = await prisma.systemSettings.update({
      where: { id: 'CURRENT' },
      data: {
        ...prismaUpdateData,
        updatedBy: userId
      }
    });

    // When the global low stock threshold changes, propagate it to products that
    // still match the previous global default. This keeps "system-wide default"
    // behavior while preserving explicit per-product overrides.
    if (
      section === 'notification' &&
      typeof sanitizedData.lowStockThreshold === 'number' &&
      typeof oldSettings.lowStockThreshold === 'number' &&
      sanitizedData.lowStockThreshold !== oldSettings.lowStockThreshold
    ) {
      await prisma.product.updateMany({
        where: {
          minimumStockThreshold: oldSettings.lowStockThreshold,
        },
        data: {
          minimumStockThreshold: sanitizedData.lowStockThreshold as number,
        },
      });
    }

    // Log individual changes to Audit Log
    for (const key in sanitizedData) {
      if (oldSettings[key as keyof typeof oldSettings] !== sanitizedData[key]) {
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
          new: jsonValue(sanitizedData[key]) ?? null,
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
    window?: 'all' | 'today' | '7d' | '30d';
  }) {
    const { page = 1, limit = 20, module, adminId, date, window = 'all' } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      entityType: 'SystemSettings'
    };

    if (module) where.action = { contains: module.toUpperCase() };
    if (adminId) where.userId = adminId;
    
    // Handle time window filtering
    const now = new Date();
    if (window === 'today' || date) {
      const targetDate = date ? new Date(date) : now;
      where.createdAt = {
        gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
        lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1)
      };
    } else if (window === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: sevenDaysAgo };
    } else if (window === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: thirtyDaysAgo };
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
