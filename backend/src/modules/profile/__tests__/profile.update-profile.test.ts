import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const updateProfileMock = jest.fn();

jest.mock('../../auth/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      userId: 'user-1',
      role: 'USER',
      email: 'customer@example.com',
    };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../profile.service', () => ({
  ProfileService: {
    updateProfile: (...args: any[]) => updateProfileMock(...args),
    getProfile: jest.fn(),
    updateLanguage: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

import profileRoutes from '../profile.routes';
import { errorHandler } from '../../../common/middleware/error.middleware';

describe('PUT /api/profile', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/profile', profileRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for empty body', async () => {
    const response = await request(app).put('/api/profile').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No fields provided to update');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('returns 400 for unknown-only fields', async () => {
    const response = await request(app)
      .put('/api/profile')
      .send({ id: 'user-1', role: 'ADMIN' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No fields provided to update');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('updates a single valid field', async () => {
    updateProfileMock.mockResolvedValue({
      id: 'profile-1',
      fullName: 'Updated Name',
    });

    const response = await request(app)
      .put('/api/profile')
      .send({ fullName: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(updateProfileMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ fullName: 'Updated Name' }),
      'USER'
    );
  });

  it('updates multiple valid fields', async () => {
    updateProfileMock.mockResolvedValue({
      id: 'profile-1',
      fullName: 'Updated Name',
      phoneNumber: '+966501234567',
      address: 'Riyadh',
    });

    const response = await request(app)
      .put('/api/profile')
      .send({
        fullName: 'Updated Name',
        phoneNumber: '+966501234567',
        address: 'Riyadh',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(updateProfileMock).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        fullName: 'Updated Name',
        phoneNumber: '+966501234567',
        address: 'Riyadh',
      }),
      'USER'
    );
  });

  it('returns 400 when no body is sent', async () => {
    const response = await request(app).put('/api/profile');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No fields provided to update');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });
});