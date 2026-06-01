import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../super-admin/super-admin.service', () => ({
  superAdminService: {
    createUser: jest.fn(),
  },
}));

jest.mock('../../admin/admin.service', () => ({
  adminService: {
    createUser: jest.fn(),
  },
}));

jest.mock('../../auth/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'super-admin-1', role: 'SUPER_ADMIN', email: 'sa@shielder.com' };
    next();
  },
}));

jest.mock('../../../common/middleware/rbac.middleware', () => ({
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

import superAdminRoutes from '../../super-admin/super-admin.routes';
import adminRoutes from '../../admin/admin.routes';
import { errorHandler } from '../../../common/middleware/error.middleware';
import { superAdminService } from '../../super-admin/super-admin.service';
import { adminService } from '../../admin/admin.service';

describe('User response sanitization', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/super-admin', superAdminRoutes);
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('super-admin create user response must not include sensitive fields', async () => {
    const rawUser = {
      id: 'u-1',
      email: 'exposed@example.com',
      role: 'ADMIN',
      passwordHash: 'secret-hash',
      resetToken: 'reset-me',
      verificationToken: 'verify-me',
      otpSessionToken: 'otp-token',
      failedLoginAttempts: 3,
      lockedUntil: null,
      tokenVersion: 5,
      profile: { fullName: 'Evil User' },
    } as any;

    (superAdminService as any).createUser.mockResolvedValue(rawUser);

    const res = await request(app)
      .post('/api/super-admin/users/create')
      .send({ email: 'exposed@example.com', password: 'SecurePassword123!', role: 'ADMIN' });

    expect(res.status).toBe(201);
    const data = res.body.data;
    expect(data).toBeDefined();
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('resetToken');
    expect(data).not.toHaveProperty('verificationToken');
    expect(data).not.toHaveProperty('otpSessionToken');
    expect(data).not.toHaveProperty('failedLoginAttempts');
    expect(data).not.toHaveProperty('lockedUntil');
    expect(data).not.toHaveProperty('tokenVersion');
  });

  it('admin create user response must not include sensitive fields', async () => {
    // mock admin auth middleware to set an admin user id/role
    jest.doMock('../../auth/auth.middleware', () => ({
      authenticate: (req: any, _res: any, next: any) => {
        req.user = { id: 'admin-1', role: 'ADMIN', email: 'admin@shielder.com' };
        next();
      },
    }));

    const rawUser = {
      id: 'u-2',
      email: 'adminexposed@example.com',
      passwordHash: 'hash',
      refreshToken: 'rt',
      profile: { fullName: 'Admin Exposed' },
    } as any;

    (adminService as any).createUser.mockResolvedValue(rawUser);

    const res = await request(app)
      .post('/api/admin/users')
      .send({ email: 'adminexposed@example.com', password: 'SecurePassword123!' });

    expect(res.status).toBe(201);
    const data = res.body.data;
    expect(data).toBeDefined();
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('refreshToken');
  });
});
