import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const createUserMock: any = jest.fn();

jest.mock('../super-admin.service', () => ({
  superAdminService: {
    createUser: (...args: any[]) => createUserMock(...args),
    getAllUsers: jest.fn(),
    getUserStats: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

jest.mock('../../auth/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'super-admin-1',
      role: 'SUPER_ADMIN',
      email: 'superadmin@shielder.com',
    };
    next();
  },
}));

jest.mock('../../../common/middleware/rbac.middleware', () => ({
  requireSuperAdmin: (_req: any, _res: any, next: any) => {
    next();
  },
}));

import superAdminRoutes from '../super-admin.routes';
import { errorHandler } from '../../../common/middleware/error.middleware';

describe('POST /api/super-admin/users/create - Input Validation', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/super-admin', superAdminRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Valid payload with all required fields
   */
  it('creates user successfully with valid payload (201 Created)', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'newadmin@shielder.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
      profile: {
        fullName: 'John Doe',
      },
    };

    createUserMock.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
        phoneNumber: '0551234567',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User account created successfully.');
    expect(response.body.data.email).toBe('newadmin@shielder.com');
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
        phoneNumber: '0551234567',
      }),
      'super-admin-1'
    );
  });

  it('returns 400 when name contains numbers or special characters', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John123!@#',
        phoneNumber: '0551234567',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'fullName',
          message: 'Name must contain letters only and cannot exceed 25 characters',
        }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('returns 400 when name exceeds 25 characters', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        phoneNumber: '0551234567',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'fullName',
          message: 'Name must contain letters only and cannot exceed 25 characters',
        }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('returns 400 when phone contains letters or special characters', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
        phoneNumber: '05512AB#67',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'phoneNumber',
          message: 'Phone number must contain digits only and cannot exceed 15 characters',
        }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('returns 400 when phone exceeds 15 digits', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
        phoneNumber: '0551234567890123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'phoneNumber',
          message: 'Phone number must contain digits only and cannot exceed 15 characters',
        }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('returns specific validation errors for a weak password', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: '123',
        role: 'ADMIN',
        fullName: 'John Doe',
        phoneNumber: '0551234567',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Password must be at least 8 characters');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password', message: 'Password must be at least 8 characters' }),
        expect.objectContaining({ field: 'password', message: 'Password must contain at least one uppercase letter' }),
        expect.objectContaining({ field: 'password', message: 'Password must contain at least one lowercase letter' }),
        expect.objectContaining({ field: 'password', message: 'Password must contain at least one special character' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 2: Missing password field → 400 Bad Request
   */
  it('returns 400 when password field is missing', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        role: 'ADMIN',
        fullName: 'John Doe',
        // password intentionally omitted
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 3: Missing role field → 400 Bad Request
   */
  it('returns 400 when role field is missing', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        fullName: 'John Doe',
        // role intentionally omitted
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 4: Missing both password and role → 400 Bad Request listing both errors
   */
  it('returns 400 with both errors when password and role are missing', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        fullName: 'John Doe',
        // password and role intentionally omitted
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 5: Missing email field → 400 Bad Request
   */
  it('returns 400 when email field is missing', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
        // email intentionally omitted
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 6: Invalid role value (not in enum) → 400 Bad Request
   */
  it('returns 400 when role value is invalid/not in enum', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: 'INVALID_ROLE',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('must be one of');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 7: Password field is an empty string → 400 Bad Request
   */
  it('returns 400 when password is an empty string', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: '',
        role: 'ADMIN',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 8: Role field is an empty string → 400 Bad Request
   */
  it('returns 400 when role is an empty string', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: '',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('must be one of');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 9: Email field is an empty string → 400 Bad Request
   */
  it('returns 400 when email is an empty string', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: '',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 10: Invalid email format → 400 Bad Request (Joi validation)
   */
  it('returns 400 when email format is invalid', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'not-a-valid-email',
        password: 'SecurePassword123!',
        role: 'ADMIN',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 11: Whitespace-only password → 400 Bad Request
   */
  it('returns 400 when password contains only whitespace', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: '   ',
        role: 'ADMIN',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Password is required');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 12b: Common weak password → 400 Bad Request
   */
  it('returns 400 when password is a common weak password', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'Password123!',
        role: 'ADMIN',
        fullName: 'John Doe',
        phoneNumber: '0551234567',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Password does not meet security requirements');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 12: Whitespace-only role → 400 Bad Request
   */
  it('returns 400 when role contains only whitespace', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: '   ',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('must be one of');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 13: Null password → 400 Bad Request
   */
  it('returns 400 when password is null', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: null,
        role: 'ADMIN',
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('"password" must be a string');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 14: Null role → 400 Bad Request
   */
  it('returns 400 when role is null', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'newadmin@shielder.com',
        password: 'SecurePassword123!',
        role: null,
        fullName: 'John Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('must be one of');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 15: Create USER role successfully
   */
  it('creates USER role successfully', async () => {
    const mockUser = {
      id: 'user-2',
      email: 'customer@example.com',
      role: 'USER',
      status: 'ACTIVE',
      isActive: true,
      profile: {
        fullName: 'Jane Customer',
      },
    };

    createUserMock.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'customer@example.com',
        password: 'SecurePassword123!',
        role: 'USER',
        fullName: 'Jane Customer',
        phoneNumber: '0559876543',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User account created successfully.');
  });

  /**
   * Test 16: Create STAFF role successfully
   */
  it('creates STAFF role successfully', async () => {
    const mockUser = {
      id: 'user-3',
      email: 'staff@shielder.com',
      role: 'STAFF',
      status: 'ACTIVE',
      isActive: true,
      profile: {
        fullName: 'John Staff',
      },
    };

    createUserMock.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        email: 'staff@shielder.com',
        password: 'SecurePassword123!',
        role: 'STAFF',
        fullName: 'John Staff',
        phoneNumber: '0551112222',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User account created successfully.');
  });

  /**
   * Test 17: All three critical fields missing → 400 Bad Request with all errors
   */
  it('returns 400 with all error messages when email, password, and role are all missing', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({
        fullName: 'John Doe',
        // email, password, role intentionally omitted
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  /**
   * Test 18: Empty request body → 400 Bad Request
   */
  it('returns 400 when request body is empty', async () => {
    const response = await request(app)
      .post('/api/super-admin/users/create')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
        expect.objectContaining({ field: 'role' }),
      ])
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });
});
