// @ts-nocheck
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { prisma } from '../../../config/database';
import { ForbiddenError } from '../../../common/errors/api.error';
import { ProfileService } from '../profile.service';

describe('ProfileService.updateProfile email restriction', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rejects email changes for customer accounts', async () => {
    const userId = 'user-1';
    const currentEmail = 'customer@example.com';
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: currentEmail }),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userProfile: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(tx));

    await expect(
      ProfileService.updateProfile(
        userId,
        { email: 'new-email@example.com', fullName: 'Customer Name' },
        'USER' as any
      )
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { email: true },
    });
    expect(tx.user.findFirst).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.userProfile.update).not.toHaveBeenCalled();
  });

  test('allows admins to change email when it is not already taken', async () => {
    const userId = 'admin-1';
    const currentEmail = 'admin@example.com';
    const updatedProfile = {
      id: 'profile-1',
      userId,
      fullName: 'Admin Name',
      email: 'updated-admin@example.com',
      user: {
        email: 'updated-admin@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    };

    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: currentEmail }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: userId, email: 'updated-admin@example.com' }),
      },
      userProfile: {
        update: jest.fn().mockResolvedValue({ id: 'profile-1' }),
        findUnique: jest.fn().mockResolvedValue(updatedProfile),
      },
    };

    jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(tx));

    const result = await ProfileService.updateProfile(
      userId,
      { email: 'updated-admin@example.com', fullName: 'Admin Name' },
      'ADMIN' as any
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { email: 'updated-admin@example.com' },
    });
    expect(result).toEqual(updatedProfile);
  });
});
