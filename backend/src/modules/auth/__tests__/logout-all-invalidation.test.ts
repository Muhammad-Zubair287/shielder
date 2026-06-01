import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '@/app';
import { prisma } from '@/config/database';

describe('Logout all device invalidation', () => {
  jest.setTimeout(120000);

  const app = createApp();
  const email = `logout-all-${Date.now()}@example.com`;
  const password = 'StrongPass123!';
  let userId: string;
  let firstAccessToken: string;
  let secondAccessToken: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'USER',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationStatus: 'VERIFIED',
        requiresEmailReverification: false,
        status: 'ACTIVE',
        isActive: true,
        profile: {
          create: {
            fullName: 'Logout All Tester',
            preferredLanguage: 'en',
          },
        },
      },
    });

    userId = user.id;
  }, 30000);

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email } });
  }, 30000);

  const login = async (userAgent: string) => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', userAgent)
      .send({ email, password })
      .expect(200);

    return response.body.data.tokens.accessToken as string;
  };

  test('login -> logout-all -> reuse same token -> 401', async () => {
    firstAccessToken = await login('logout-all-client-a');

    await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${firstAccessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: true,
          message: 'Logged out from all devices successfully',
        });
      });

    await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${firstAccessToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          message: 'Token has already been invalidated',
        });
      });
  }, 30000);

  test('login -> logout-all -> login again -> new token works', async () => {
    secondAccessToken = await login('logout-all-client-b');

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${secondAccessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  }, 30000);

  test('two device tokens are both rejected after logout-all', async () => {
    const deviceOneToken = await login('logout-all-client-c');
    const deviceTwoToken = await login('logout-all-client-d');

    await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${deviceOneToken}`)
      .expect(200);

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${deviceOneToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token has already been invalidated');
      });

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${deviceTwoToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Token has already been invalidated');
      });
  }, 30000);

  test('invalidated token is rejected on any protected endpoint', async () => {
    const invalidatedToken = await login('logout-all-client-e');

    await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${invalidatedToken}`)
      .expect(200);

    await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${invalidatedToken}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Token has already been invalidated');
      });
  }, 30000);
});
