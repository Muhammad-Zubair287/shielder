/**
 * Test: User Status Fields Standardization
 *
 * Verifies that AuthService.getCurrentUser returns only the standardized status field
 * and the standardized phoneNumber field.
 */

import { describe, expect, beforeEach, it, jest } from '@jest/globals';

jest.mock('@/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/common/logger/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { prisma } from '@/config/database';
import { AuthService } from '../auth.service';

describe('User Status Fields Standardization', () => {
  const phoneNumber = '+966512345678';
  const findUniqueMock = prisma.user.findUnique as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDbUser = () => ({
    id: 'user-1',
    email: 'status-test@example.com',
    role: 'USER',
    status: 'ACTIVE',
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: null,
    verificationStatus: 'VERIFIED',
    requiresEmailReverification: false,
    profile: {
      fullName: 'Status Test User',
      phoneNumber,
      preferredLanguage: 'en',
    },
  });

  it('returns the current user without isActive and with phoneNumber only', async () => {
    findUniqueMock.mockResolvedValue(createDbUser());

    const user = await AuthService.getCurrentUser('user-1');

    expect(user).toBeDefined();
    expect(user.status).toBe('ACTIVE');
    expect(Object.prototype.hasOwnProperty.call(user, 'isActive')).toBe(false);
    expect((user as any).isActive).toBeUndefined();
    expect(user.profile).toBeDefined();
    expect(user.profile?.phoneNumber).toBe(phoneNumber);
    expect(Object.prototype.hasOwnProperty.call(user.profile || {}, 'phone')).toBe(false);
  });

  it('keeps the standardized user activation state contract', async () => {
    findUniqueMock.mockResolvedValue(createDbUser());

    const user = await AuthService.getCurrentUser('user-1');

    expect(user.hasOwnProperty('status')).toBe(true);
    expect(user.hasOwnProperty('isActive')).toBe(false);
    expect(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'PENDING_VERIFICATION']).toContain(user.status);
  });
});