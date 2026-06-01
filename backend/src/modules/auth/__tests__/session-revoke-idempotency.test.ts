import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '@/app';
import { prisma } from '@/config/database';

describe('Session revoke idempotency', () => {
  jest.setTimeout(120000);

  const app = createApp();
  const userOneEmail = `session-revoke-${Date.now()}-a@example.com`;
  const userTwoEmail = `session-revoke-${Date.now()}-b@example.com`;
  const password = 'StrongPass123!';
  let userOneId: string;
  let userTwoId: string;
  let userOneAccessToken: string;
  let userTwoAccessToken: string;
  let userOneSessionId: string;
  let userTwoSessionId: string;

  beforeAll(async () => {
    const [userOnePasswordHash, userTwoPasswordHash] = await Promise.all([
      bcrypt.hash(password, 10),
      bcrypt.hash(password, 10),
    ]);

    const [userOne, userTwo] = await Promise.all([
      prisma.user.create({
        data: {
          email: userOneEmail,
          passwordHash: userOnePasswordHash,
          role: 'USER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          verificationStatus: 'VERIFIED',
          requiresEmailReverification: false,
          status: 'ACTIVE',
          isActive: true,
          profile: {
            create: {
              fullName: 'Session Revoke Tester One',
              preferredLanguage: 'en',
            },
          },
        },
      }),
      prisma.user.create({
        data: {
          email: userTwoEmail,
          passwordHash: userTwoPasswordHash,
          role: 'USER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          verificationStatus: 'VERIFIED',
          requiresEmailReverification: false,
          status: 'ACTIVE',
          isActive: true,
          profile: {
            create: {
              fullName: 'Session Revoke Tester Two',
              preferredLanguage: 'en',
            },
          },
        },
      }),
    ]);

    userOneId = userOne.id;
    userTwoId = userTwo.id;
  }, 30000);

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: [userOneId, userTwoId] } } });
    await prisma.user.deleteMany({ where: { email: { in: [userOneEmail, userTwoEmail] } } });
  }, 30000);

  const loginAndCaptureSession = async (email: string, userAgent: string) => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', userAgent)
      .send({ email, password })
      .expect(200);

    const accessToken = loginResponse.body.data.tokens.accessToken as string;

    const sessionsResponse = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const sessions = sessionsResponse.body.data.sessions as Array<{ id: string }>;
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBeGreaterThan(0);

    return {
      accessToken,
      sessionId: sessions[0].id,
    };
  };

  test('revoking a valid active session returns 200', async () => {
    const session = await loginAndCaptureSession(userOneEmail, 'session-revoke-a');
    userOneAccessToken = session.accessToken;
    userOneSessionId = session.sessionId;

    const revokeResponse = await request(app)
      .delete(`/api/auth/sessions/${userOneSessionId}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(200);

    expect(revokeResponse.body).toMatchObject({
      success: true,
      message: 'Session revoked successfully',
    });
  }, 30000);

  test('revoking the same session again returns 404', async () => {
    const repeatResponse = await request(app)
      .delete(`/api/auth/sessions/${userOneSessionId}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(404);

    expect(repeatResponse.body).toMatchObject({
      success: false,
      message: 'Session not found or already revoked',
    });
  }, 30000);

  test('revoking a fake session id returns 404', async () => {
    const fakeSessionId = '11111111-1111-1111-1111-111111111111';

    const fakeResponse = await request(app)
      .delete(`/api/auth/sessions/${fakeSessionId}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(404);

    expect(fakeResponse.body).toMatchObject({
      success: false,
      message: 'Session not found or already revoked',
    });
  }, 30000);

  test('revoking another user session returns 403', async () => {
    const secondSession = await loginAndCaptureSession(userTwoEmail, 'session-revoke-b');
    userTwoAccessToken = secondSession.accessToken;
    userTwoSessionId = secondSession.sessionId;

    const forbiddenResponse = await request(app)
      .delete(`/api/auth/sessions/${userTwoSessionId}`)
      .set('Authorization', `Bearer ${userOneAccessToken}`)
      .expect(403);

    expect(forbiddenResponse.body).toMatchObject({
      success: false,
      message: 'You do not have permission to revoke this session',
    });
  }, 30000);

  test('revoke succeeds only once for a fresh session', async () => {
    const freshSession = await loginAndCaptureSession(userTwoEmail, 'session-revoke-b-2');

    await request(app)
      .delete(`/api/auth/sessions/${freshSession.sessionId}`)
      .set('Authorization', `Bearer ${freshSession.accessToken}`)
      .expect(200);

    await request(app)
      .delete(`/api/auth/sessions/${freshSession.sessionId}`)
      .set('Authorization', `Bearer ${freshSession.accessToken}`)
      .expect(404);
  }, 30000);
});
