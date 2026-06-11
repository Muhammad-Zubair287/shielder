/// <reference types="jest" />
import request = require('supertest');

const mockSystemSettings = {
  id: 'CURRENT',
  systemName: 'Shielder',
  companyName: 'Shielder Digital',
  companyNameEn: 'Shielder Digital',
  companyNameAr: 'شيلدر الرقمية',
  companyLogo: '/uploads/logo-original.jpg',
  companyEmail: 'info@shielder.com',
  companyPhone: '12345678',
  companyAddress: 'Address',
  currency: 'SAR',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  language: 'en',
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  accountLockDurationMinutes: 30,
  sessionTimeoutMinutes: 10,
  enableTwoFactorAuth: false,
  forceStrongPasswords: true,
};

const mockUser = {
  id: 'mock-user-id',
  email: 'admin-settings-test@example.com',
  role: 'ADMIN',
  emailVerified: true,
  status: 'ACTIVE',
  isActive: true,
  profile: {
    fullName: 'Settings Tester',
    preferredLanguage: 'en',
  },
};

// Mock database to avoid running against railway/live postgres
jest.mock('../../../config/database', () => {
  return {
    __esModule: true,
    prisma: {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findFirst: jest.fn().mockResolvedValue(mockUser),
        create: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(mockUser),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      systemSettings: {
        findUnique: jest.fn().mockResolvedValue(mockSystemSettings),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(mockSystemSettings, data);
          return Promise.resolve(mockSystemSettings);
        }),
      },
      systemConfigSnapshot: {
        findFirst: jest.fn().mockResolvedValue({ version: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'snapshot-id' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'refresh-token-id' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    },
    default: {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findFirst: jest.fn().mockResolvedValue(mockUser),
        create: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(mockUser),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      systemSettings: {
        findUnique: jest.fn().mockResolvedValue(mockSystemSettings),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(mockSystemSettings, data);
          return Promise.resolve(mockSystemSettings);
        }),
      },
      systemConfigSnapshot: {
        findFirst: jest.fn().mockResolvedValue({ version: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'snapshot-id' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'refresh-token-id' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }
  };
});

// Mock authentication and authorization middleware to automatically authorize test requests
jest.mock('../../auth/auth.middleware', () => {
  const mockAuthenticate = (req: any, _res: any, next: any) => {
    req.user = {
      id: 'mock-user-id',
      email: 'admin-settings-test@example.com',
      role: 'ADMIN',
    };
    next();
  };

  const mockAuthorize = (...allowedRoles: string[]) => {
    return (req: any, _res: any, next: any) => {
      next();
    };
  };

  return {
    __esModule: true,
    authenticate: mockAuthenticate,
    authorize: mockAuthorize,
    optionalAuth: (req: any, _res: any, next: any) => next(),
    verifyEmailStatus: (req: any, _res: any, next: any) => next(),
    AuthMiddleware: {
      authenticate: mockAuthenticate,
      authorize: mockAuthorize,
      optionalAuth: (req: any, _res: any, next: any) => next(),
      verifyEmailStatus: (req: any, _res: any, next: any) => next(),
    },
  };
});

import { createApp } from '../../../app';
import env from '../../../config/env';

describe('System Settings API', () => {
  jest.setTimeout(120000);

  const app = createApp();
  const accessToken = 'mock-access-token';
  let originalAppUrl: string | undefined;
  let originalBaseUrl: string | undefined;

  beforeAll(async () => {
    // Keep original env variables
    originalAppUrl = process.env.APP_URL;
    originalBaseUrl = process.env.BASE_URL;

    // Set custom env variables for testing
    process.env.APP_URL = 'https://my-custom-test-domain.com';
    delete process.env.BASE_URL;
    
    // Override env.APP_URL dynamically since it is evaluated on import
    (env as any).APP_URL = 'https://my-custom-test-domain.com';
  });

  afterAll(async () => {
    // Restore env variables
    if (originalAppUrl !== undefined) {
      process.env.APP_URL = originalAppUrl;
    } else {
      delete process.env.APP_URL;
    }
    if (originalBaseUrl !== undefined) {
      process.env.BASE_URL = originalBaseUrl;
    } else {
      delete process.env.BASE_URL;
    }
  });

  describe('PUT /api/settings/general (Logo upload & update)', () => {
    it('uploads a logo file and returns a fully qualified URL starting with https://', async () => {
      const response = await request(app)
        .put('/api/settings/general')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('companyLogo', Buffer.from('fake png file data'), 'test-logo.png')
        .field('companyName', 'Test Shielder Corp')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.companyLogo).toBeDefined();
      expect(response.body.data.companyLogo).toMatch(/^https:\/\/my-custom-test-domain\.com\/uploads\/companyLogo-/);
      expect(response.body.data.companyName).toBe('Test Shielder Corp');
    });

    it('works with the alternate field name "logo" and returns full URL', async () => {
      const response = await request(app)
        .put('/api/settings/general')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('logo', Buffer.from('fake png file data'), 'logo.png')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companyLogo).toMatch(/^https:\/\/my-custom-test-domain\.com\/uploads\/logo-/);
    });
  });

  describe('GET /api/settings/general', () => {
    it('returns settings containing the fully qualified logo URL', async () => {
      const response = await request(app)
        .get('/api/settings/general')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companyLogo).toMatch(/^https:\/\/my-custom-test-domain\.com\/uploads\//);
    });
  });

  describe('GET /api/settings', () => {
    it('returns all settings with fully qualified file fields', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companyLogo).toMatch(/^https:\/\/my-custom-test-domain\.com\/uploads\//);
    });
  });
});
