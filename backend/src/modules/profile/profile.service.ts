import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/api.error';
import { logger } from '../../common/logger/logger';
import { UserRole } from '../../types/rbac.types';
import { PROFILE_UPDATE_FIELDS } from './profile.validation';

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
  static async updateProfile(userId: string, data: UpdateProfileInput, currentUserRole: UserRole) {
    try {
      // FIX: Explicit null values (e.g. { profileImage: null }) represent an
      // intentional "remove" action and must count as a valid update.
      // The old check excluded null entirely, causing "Remove Photo" to
      // always throw "No fields provided to update" (400 Bad Request).
      const hasUpdatableField = PROFILE_UPDATE_FIELDS.some((field) => {
        if (!Object.prototype.hasOwnProperty.call(data, field)) {
          return false;
        }

        const value = (data as Record<string, unknown>)[field];

        // Explicit null is a valid "clear this field" update (e.g. remove photo)
        if (value === null) {
          return true;
        }

        return value !== undefined && !(typeof value === 'string' && value.trim() === '');
      });

      if (!hasUpdatableField) {
        throw new BadRequestError('No fields provided to update');
      }

      const normalizedEmail = data.email?.trim().toLowerCase();
      const { email: _email, ...profileData } = data;

      const profile = await prisma.$transaction(async (tx) => {
        if (normalizedEmail) {
          const currentUser = await tx.user.findUnique({
            where: { id: userId },
            select: { email: true },
          });

          if (!currentUser) {
            throw new NotFoundError('Profile not found');
          }

          const currentEmail = currentUser.email.trim().toLowerCase();

          if (currentUserRole === UserRole.USER && normalizedEmail !== currentEmail) {
            throw new ForbiddenError('Customers cannot change their email address');
          }

          if (normalizedEmail !== currentEmail) {
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