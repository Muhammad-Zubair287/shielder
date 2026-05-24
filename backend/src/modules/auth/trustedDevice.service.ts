import crypto from 'crypto';
import { prisma } from '@/config/database';
import { logger } from '@/common/logger/logger';

const trustedDeviceClient = prisma as typeof prisma & {
  trustedDevice: {
    create: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
  };
};

export class TrustedDeviceService {
  /**
   * Create a trusted device token and store it
   */
  static async createTrustedDevice(
    userId: string,
    name?: string,
    deviceInfo?: string,
    ipAddress?: string,
    expiresDays = 30
  ): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresDays);

      await trustedDeviceClient.trustedDevice.create({
        data: {
          userId,
          token,
          name,
          deviceInfo,
          ipAddress,
          expiresAt,
        },
      });

      logger.info(`Trusted device created for user ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error creating trusted device:', error);
      throw error;
    }
  }

  static async verifyDeviceToken(token: string) {
    try {
      if (!token) {
        logger.info('No token provided for device verification');
        return null;
      }

      const record = await trustedDeviceClient.trustedDevice.findUnique({ where: { token } });
      
      if (!record) {
        logger.warn(`Device token not found: ${token.slice(0, 8)}...`);
        return null;
      }

      if (record.isRevoked) {
        logger.warn(`Device token revoked: ${token.slice(0, 8)}...`);
        return null;
      }

      const now = new Date();
      if (record.expiresAt && now > record.expiresAt) {
        logger.warn(`Device token expired: ${token.slice(0, 8)}...`);
        return null;
      }

      logger.info(`✅ Device token valid: ${token.slice(0, 8)}...`);

      // Update lastUsedAt
      await trustedDeviceClient.trustedDevice.update({ 
        where: { id: record.id }, 
        data: { lastUsedAt: new Date() } 
      });

      return record;
    } catch (error) {
      logger.error('Error verifying trusted device token:', error);
      return null;
    }
  }

  static async revokeDevice(userId: string, token: string): Promise<void> {
    try {
      await trustedDeviceClient.trustedDevice.updateMany({ where: { userId, token }, data: { isRevoked: true } });
      logger.info(`Trusted device revoked for user ${userId}`);
    } catch (error) {
      logger.error('Error revoking trusted device:', error);
      throw error;
    }
  }

  static async listDevices(userId: string) {
    try {
      return await trustedDeviceClient.trustedDevice.findMany({ where: { userId, isRevoked: false } });
    } catch (error) {
      logger.error('Error listing trusted devices:', error);
      return [];
    }
  }
}

export default TrustedDeviceService;
