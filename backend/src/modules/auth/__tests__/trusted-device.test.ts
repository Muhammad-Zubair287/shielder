import { prisma } from '@/config/database';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { TrustedDeviceService } from '../trustedDevice.service';
import { TwoFactorService } from '../twofa.service';
import { TokenService } from '../token.service';

describe('Trusted device login flow', () => {
  // Some auth flows involve async DB work; increase jest timeout for this suite
  jest.setTimeout(120000);
  let userId: string;
  let email = 'trusted-test-' + Date.now() + '@example.com';
  const password = 'P@ssw0rd!';
  let realUserUpdate: any;

  beforeAll(() => {
    realUserUpdate = prisma.user.update.bind(prisma.user);
    jest.spyOn(TokenService, 'generateTokenPair').mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });
    jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as never);
    jest.spyOn(prisma.trustedDevice, 'update').mockImplementation(async (args: any) => {
      const record = await prisma.trustedDevice.findUnique({ where: args.where });
      return (record || {}) as never;
    });
    jest.spyOn(prisma.user, 'update').mockImplementation(async (args: any) => {
      if (args?.data && Object.prototype.hasOwnProperty.call(args.data, 'otpSessionToken')) {
        return realUserUpdate(args);
      }

      const record = await prisma.user.findUnique({ where: args.where });
      return (record || {}) as never;
    });
  });

  beforeAll(async () => {
    // Create test user (ADMIN)
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
        isActive: true,
        profile: { create: { fullName: 'Trusted Tester', preferredLanguage: 'en' } },
      },
    });
    userId = user.id;
  }, 30000);

  afterAll(async () => {
    await prisma.trustedDevice.deleteMany({ where: { userId } });
    await prisma.twoFactorOTP.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email } });
    jest.restoreAllMocks();
  }, 30000);

  test('login with valid trusted device token skips 2FA', async () => {
    // create trusted device token
    const token = await TrustedDeviceService.createTrustedDevice(userId, 'jest-device', 'jest-agent', '127.0.0.1', 1);

    // Attempt login using AuthService.login with deviceInfo containing trustedDeviceToken
    const result = await AuthService.login({ email, password } as any, { trustedDeviceToken: token } as any);

    expect(result).toBeDefined();
    expect(result.tokens).toBeDefined();
    expect(result.requiresTwoFactor).toBeUndefined();
    expect(result.tokens.accessToken).toBeTruthy();
  }, 30000);

  test('OTP verification auto-issues trusted device token for admin users', async () => {
    const { otp } = await TwoFactorService.createOTP(userId, 'EMAIL');
    const otpSessionToken = 'otp-session-' + Date.now();

    await prisma.user.update({
      where: { id: userId },
      data: { otpSessionToken },
    });

    const result = await AuthService.verifyOTPAndGetTokens(
      userId,
      otp,
      otpSessionToken,
      { userAgent: 'jest-agent', ipAddress: '127.0.0.1' },
      true
    );

    expect(result.trustedDeviceToken).toBeDefined();
    expect(result.trustedDeviceToken).toHaveLength(64);

    const loginResult = await AuthService.login(
      { email, password } as any,
      { trustedDeviceToken: result.trustedDeviceToken } as any
    );

    expect(loginResult.requiresTwoFactor).toBeUndefined();
    expect(loginResult.tokens.accessToken).toBeTruthy();
  }, 30000);
});
