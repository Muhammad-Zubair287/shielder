import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../common/errors/api.error';
import { logger } from '../../common/logger/logger';

type UpdateProfileInput = {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  location?: string;
  profileImage?: string | null;
  companyName?: string;
  taxId?: string;
  preferences?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

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
  static async updateProfile(userId: string, data: UpdateProfileInput) {
    try {
      const normalizedEmail = data.email?.trim().toLowerCase();
      const { email: _email, ...profileData } = data;

      const profile = await prisma.$transaction(async (tx) => {
        if (normalizedEmail) {
          const existingUser = await tx.user.findFirst({
            where: {
              email: normalizedEmail,
              NOT: { id: userId },
            },
            select: { id: true },
          });

          if (existingUser) {
            throw new ConflictError('Email is already in use');
          }

          await tx.user.update({
            where: { id: userId },
            data: { email: normalizedEmail },
          });
        }

        await tx.userProfile.update({
          where: { userId },
          data: profileData,
        });

        return tx.userProfile.findUnique({
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
      });

      if (!profile) {
        throw new NotFoundError('Profile not found');
      }

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

  /**
   * Update user general preferences (theme, etc)
   */
  static async updatePreferences(userId: string, preferences: any) {
    try {
      const currentProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { preferences: true }
      });

      const updatedPreferences = {
        ...(currentProfile?.preferences as any || {}),
        ...preferences
      };

      const profile = await prisma.userProfile.update({
        where: { userId },
        data: { preferences: updatedPreferences },
      });

      logger.info(`Preferences updated for user: ${userId}`);
      return profile;
    } catch (error) {
      logger.error(`Error updating preferences for user ${userId}:`, error);
      throw error;
    }
  }
}
