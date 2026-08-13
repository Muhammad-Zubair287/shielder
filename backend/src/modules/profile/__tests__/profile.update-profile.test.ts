import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const updateProfileMock = jest.fn();
const getProfileMock = jest.fn();
const storeProfileImageFileMock = jest.fn();
const deleteLocalProfileImageFileMock = jest.fn();

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
    getProfile: (...args: any[]) => getProfileMock(...args),
    updateLanguage: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

jest.mock('../../../common/services/profile-image.service', () => ({
  getAllowedProfileImageMimeTypes: () => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  getMaxProfileImageSizeBytes: () => 5 * 1024 * 1024,
  storeProfileImageFile: (...args: any[]) => storeProfileImageFileMock(...args),
  deleteLocalProfileImageFile: (...args: any[]) => deleteLocalProfileImageFileMock(...args),
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
    getProfileMock.mockResolvedValue({ profileImage: '/uploads/profile/old.jpg' });
    storeProfileImageFileMock.mockResolvedValue({ path: '/uploads/profile/user-1-new.jpg' });
  });

  it('returns 400 for empty body', async () => {
    const response = await request(app).put('/api/profile').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No fields provided to update.');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('returns 400 for unknown-only fields', async () => {
    const response = await request(app)
      .put('/api/profile')
      .send({ id: 'user-1', role: 'ADMIN' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No fields provided to update.');
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
    expect(response.body.message).toBe('No fields provided to update.');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('rejects base64 data URIs for profileImage updates', async () => {
    const response = await request(app)
      .put('/api/profile')
      .send({ profileImage: 'data:image/png;base64,iVBORw0KGgo=' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('URL/path');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('uploads a profile image and returns only the stored URL/path', async () => {
    updateProfileMock.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      profileImage: '/uploads/profile/user-1-new.jpg',
    });

    const response = await request(app)
      .post('/api/profile/upload-image')
      .attach('profileImage', Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.imageUrl).toMatch(/\/api\/storage\/private\//);
    expect(response.body.data.profileImage).toMatch(/\/api\/storage\/private\//);
    expect(JSON.stringify(response.body)).not.toContain('data:image');
    expect(JSON.stringify(response.body)).not.toContain('/uploads/profile/user-1-new.jpg');
    expect(updateProfileMock).toHaveBeenCalledWith(
      'user-1',
      { profileImage: '/uploads/profile/user-1-new.jpg' },
      'USER'
    );
    expect(deleteLocalProfileImageFileMock).toHaveBeenCalledWith('/uploads/profile/old.jpg');
  });
});
