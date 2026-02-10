import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/api.error';
import { logger } from '../../common/logger/logger';

export class ProfileService {
  /**
   * Get user profile by user ID
   */
  static async getProfile(userId: string) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return profile;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: any) {
    try {
      const profile = await prisma.userProfile.update({
        where: { userId },
        data,
      });

      logger.info(`Profile updated for user: ${userId}`);
      return profile;
    } catch (error) {
      logger.error(`Error updating profile for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user language preference
   */
  static async updateLanguage(userId: string, preferredLanguage: string) {
    try {
      const profile = await prisma.userProfile.update({
        where: { userId },
        data: { preferredLanguage },
      });

      logger.info(`Language updated to ${preferredLanguage} for user: ${userId}`);
      return profile;
    } catch (error) {
      logger.error(`Error updating language for user ${userId}:`, error);
      throw error;
    }
  }
}
