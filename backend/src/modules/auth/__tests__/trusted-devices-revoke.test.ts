import authController from '../auth.controller';
import { prisma } from '@/config/database';
import bcrypt from 'bcryptjs';
import { TrustedDeviceService } from '../trustedDevice.service';

describe('Trusted devices list & revoke', () => {
  jest.setTimeout(120000);
  let userId: string;
  let email = 'trusted-revoke-' + Date.now() + '@example.com';
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
        profile: { create: { fullName: 'Trusted Revoke Tester', preferredLanguage: 'en' } },
      },
    });
    userId = user.id;
  }, 30000);

  afterAll(async () => {
    await prisma.trustedDevice.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email } });
  }, 30000);

  test('lists trusted devices and allows revocation', async () => {
    // create two devices
    const tokenA = await TrustedDeviceService.createTrustedDevice(userId, 'device-a', 'agent-a', '127.0.0.1', 1);
    const tokenB = await TrustedDeviceService.createTrustedDevice(userId, 'device-b', 'agent-b', '127.0.0.2', 1);

    // Mock response helpers
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    // Helper to wait until status mock is called
    const waitForStatus = async (statusMock: jest.Mock, timeoutMs = 5000) => {
      const startedAt = Date.now();
      while (statusMock.mock.calls.length === 0 && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };

    // Call controller to list devices
    await authController.getTrustedDevices({ user: { userId } } as any, { status } as any, jest.fn() as any);
    await waitForStatus(status);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));

    // Now revoke tokenA
    const params = { token: tokenA } as any;
    const json2 = jest.fn();
    const status2 = jest.fn().mockReturnValue({ json: json2 });

    await authController.revokeTrustedDevice({ user: { userId }, params } as any, { status: status2 } as any, jest.fn() as any);
    await waitForStatus(status2);

    expect(status2).toHaveBeenCalledWith(200);

    // Verify listing now returns only one device
    const json3 = jest.fn();
    const status3 = jest.fn().mockReturnValue({ json: json3 });

    await authController.getTrustedDevices({ user: { userId } } as any, { status: status3 } as any, jest.fn() as any);
    await waitForStatus(status3);
    expect(status3).toHaveBeenCalledWith(200);

    // Check payload contains devices array with length 1
    const payload = json3.mock.calls[0][0];
    const devices = payload.data?.devices || [];
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBe(1);
    expect(devices[0].token).toBe(tokenB);
  }, 30000);
});
