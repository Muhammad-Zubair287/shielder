import request from 'supertest';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

jest.mock('../auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-1', role: 'USER', email: 'user@example.com' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../auth.service', () => ({
  AuthService: {
    getCurrentUser: jest.fn(),
  },
}));

import { createApp } from '@/app';
import { AuthService } from '../auth.service';

describe('Current user phone contract', () => {
  const app = createApp();
  const phoneNumber = '+966500000000';
  const getCurrentUserMock = AuthService.getCurrentUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/auth/me returns phoneNumber only', async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        fullName: 'Auth Me Contract Tester',
        phoneNumber,
      },
    });

    const response = await request(app).get('/api/auth/me').expect(200);

    const user = response.body.data.user;

    expect(user.profile).toBeDefined();
    expect(user.profile.phoneNumber).toBe(phoneNumber);
    expect(Object.prototype.hasOwnProperty.call(user.profile, 'phone')).toBe(false);
    expect(user.profile.phone).toBeUndefined();
  });
});