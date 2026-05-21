import authController from '../auth.controller';
import { prisma } from '@/config/database';
import bcrypt from 'bcryptjs';
import { TrustedDeviceService } from '../trustedDevice.service';

describe('Trusted device status endpoint', () => {
  let userId: string;
  let email = 'trusted-status-' + Date.now() + '@example.com';
  const password = 'P@ssw0rd!';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
        isActive: true,
        profile: { create: { fullName: 'Trusted Status Tester', preferredLanguage: 'en' } },
      },
    });
    userId = user.id;
  }, 30000);

  afterAll(async () => {
    await prisma.trustedDevice.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email } });
  }, 30000);

  const waitForStatus = async (statusMock: jest.Mock, timeoutMs = 5000) => {
    const startedAt = Date.now();
    while (statusMock.mock.calls.length === 0 && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  test('returns trusted false when no device token is present', async () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    await authController.getTrustedDeviceStatus(
      { headers: {} } as never,
      { status } as never,
      jest.fn() as never
    );
    await waitForStatus(status);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { trusted: false, expiresAt: null },
    });
  }, 30000);

  test('returns trusted true for a valid trusted-device cookie', async () => {
    const token = await TrustedDeviceService.createTrustedDevice(userId, 'jest-device', 'jest-agent', '127.0.0.1', 1);
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    await authController.getTrustedDeviceStatus(
      { headers: { cookie: `trustedDeviceToken=${token}` } } as never,
      { status } as never,
      jest.fn() as never
    );
    await waitForStatus(status);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ trusted: true }),
      })
    );
  }, 30000);
});
