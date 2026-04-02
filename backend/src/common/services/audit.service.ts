import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

type AuditLogInput = {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
};

export class AuditService {
  /**
   * Log an action to the audit_logs table
   */
  static async log(data: AuditLogInput) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          location: data.location,
        },
      });
    } catch (error) {
      console.error('Audit Log Error:', error);
      // Don't throw error to avoid breaking main flow
    }
  }
}
