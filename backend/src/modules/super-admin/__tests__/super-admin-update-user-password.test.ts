import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { afterAll, beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../../config/database';

const delCacheMock: any = jest.fn(() => Promise.resolve(null));
const auditLogMock: any = jest.fn(() => Promise.resolve(undefined));

jest.mock('../../auth/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'super-admin-test-user',
      role: 'SUPER_ADMIN',
      email: 'superadmin@shielder.com',
    };
    next();
  },
}));

jest.mock('../../../common/middleware/rbac.middleware', () => ({
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('@/common/middleware/rateLimit.middleware', () => ({
  rateLimitAuth: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('@/common/services/redis-cache.service', () => ({
  __esModule: true,
  default: {
    del: (...args: any[]) => delCacheMock(...args),
  },
}));

jest.mock('../../../common/services/audit.service', () => ({
  AuditService: {
    log: (...args: any[]) => auditLogMock(...args),
  },
}));

import superAdminRoutes from '../super-admin.routes';
import authRoutes from '../../auth/auth.routes';
import { errorHandler } from '../../../common/middleware/error.middleware';

const app = express();
app.use(express.json());
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/auth', authRoutes);
app.use(errorHandler);

const createdEmails: string[] = [];

jest.setTimeout(30000);

type TestUser = {
  id: string;
  email: string;
  originalPassword: string;
};

const createVerifiedTestUser = async (): Promise<TestUser> => {
  const email = `super-admin-update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const originalPassword = 'OriginalPass123!';
  const passwordHash = await bcrypt.hash(originalPassword, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      verificationStatus: 'VERIFIED',
      requiresEmailReverification: false,
      profile: {
        create: {
          fullName: 'Original User',
        },
      },
    },
  });

  createdEmails.push(email);

  return {
    id: user.id,
    email,
    originalPassword,
  };
};

const deleteTestUsers = async (emails: string[]) => {
  await prisma.user.deleteMany({
    where: {
      email: { in: emails },
    },
  });
};

describe('PATCH/PUT /api/super-admin/users/:id - Password update validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (createdEmails.length > 0) {
      await deleteTestUsers([...createdEmails]);
      createdEmails.length = 0;
    }

    delCacheMock.mockClear();
    auditLogMock.mockClear();
  });

  it('updates password successfully and allows login with the new password', async () => {
    const user = await createVerifiedTestUser();
    const newPassword = 'ValidPass123!';

    const updateResponse = await request(app)
      .put(`/api/super-admin/users/${user.id}`)
      .send({
        password: newPassword,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: newPassword,
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
  });

  it('returns 400 when password is an empty string', async () => {
    const user = await createVerifiedTestUser();

    const response = await request(app)
      .put(`/api/super-admin/users/${user.id}`)
      .send({
        password: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Password cannot be empty');
  });

  it('returns 400 when password is whitespace only', async () => {
    const user = await createVerifiedTestUser();

    const response = await request(app)
      .put(`/api/super-admin/users/${user.id}`)
      .send({
        password: '   ',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Password cannot be empty');
  });

  it('returns 400 when password is a common weak password', async () => {
    const user = await createVerifiedTestUser();

    const response = await request(app)
      .put(`/api/super-admin/users/${user.id}`)
      .send({
        password: 'Password123!',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('updates user without password and keeps the original password valid', async () => {
    const user = await createVerifiedTestUser();

    const updateResponse = await request(app)
      .put(`/api/super-admin/users/${user.id}`)
      .send({
        fullName: 'Updated User Name',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.success).toBe(true);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: user.originalPassword,
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
  });

  it('returns 400 when password is below the minimum length', async () => {
    const user = await createVerifiedTestUser();

    const response = await request(app)
      .put(`/api/super-admin/users/${user.id}`)
      .send({
        password: 'Short1!',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });
});
