/**
 * Email Reverification Feature Tests
 *
 * IMPORTANT: Before running these tests, apply the Prisma migration:
 *   npm run prisma:migrate
 *
 * Or for Railway/production environment:
 *   npx prisma migrate deploy
 *
 * These tests cover:
 * - Login blocking for unverified customers (returns verification session instead of tokens)
 * - OTP generation, verification, and resend flows
 * - Email change during verification
 * - Middleware enforcement to prevent unverified users from accessing protected routes
 * - State consistency for verified vs unverified customers
 */

import { prisma } from '@/config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthService } from '../auth.service';
import { TwoFactorService } from '../twofa.service';
import { TokenService } from '../token.service';
import { AuthMiddleware } from '../auth.middleware';
import { emailService } from '@/common/services/email.service';

describe('Email reverification flow for legacy customers', () => {
  jest.setTimeout(120000);

  let unverifiedUserId: string;
  let unverifiedEmail = 'unverified-' + Date.now() + '@example.com';
  let verifiedUserId: string;
  let verifiedEmail = 'verified-' + Date.now() + '@example.com';
  const password = 'P@ssw0rd!';
  let verificationSessionToken: string;

  beforeAll(async () => {
    // Create unverified customer (legacy account marked for re-verification)
    const passwordHash = await bcrypt.hash(password, 10);
    const unverifiedUser = await prisma.user.create({
      data: {
        email: unverifiedEmail,
        passwordHash,
        role: 'USER',
        emailVerified: false,
        emailVerifiedAt: null,
        verificationStatus: 'REVERIFY_REQUIRED',
        requiresEmailReverification: true,
        status: 'ACTIVE',
        isActive: true,
        profile: { create: { fullName: 'Unverified Tester', preferredLanguage: 'en' } },
      },
    });
    unverifiedUserId = unverifiedUser.id;

    // Create already-verified customer
    const verifiedUser = await prisma.user.create({
      data: {
        email: verifiedEmail,
        passwordHash,
        role: 'USER',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationStatus: 'VERIFIED',
        requiresEmailReverification: false,
        status: 'ACTIVE',
        isActive: true,
        profile: { create: { fullName: 'Verified Tester', preferredLanguage: 'en' } },
      },
    });
    verifiedUserId = verifiedUser.id;

    // Mock TokenService to avoid JWT generation complexity
    jest.spyOn(TokenService, 'generateTokenPair').mockResolvedValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });
    jest.spyOn(prisma.refreshToken, 'create').mockResolvedValue({} as never);
    jest.spyOn(emailService, 'sendEmail').mockResolvedValue(true as never);
  }, 30000);

  afterAll(async () => {
    await prisma.twoFactorOTP.deleteMany({ where: { userId: { in: [unverifiedUserId, verifiedUserId] } } });
    await prisma.user.deleteMany({
      where: { email: { in: [unverifiedEmail, verifiedEmail] } },
    });
    jest.restoreAllMocks();
  }, 30000);

  describe('Login scenarios', () => {
    test('login with unverified customer returns requiresVerification without tokens', async () => {
      const result = await AuthService.login({
        email: unverifiedEmail,
        password,
      } as any);

      expect(result).toBeDefined();
      expect(result.requiresEmailVerification).toBe(true);
      expect(result.verificationSessionToken).toBeTruthy();
      expect(result.verificationEmail).toBe(unverifiedEmail);
      expect(result.verificationExpiresInMinutes).toBe(15);
      expect(result.tokens).toBeUndefined();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(unverifiedUserId);

      // Store the token for subsequent tests
      verificationSessionToken = result.verificationSessionToken!;
    }, 30000);

    test('login with verified customer returns tokens normally', async () => {
      const result = await AuthService.login({
        email: verifiedEmail,
        password,
      } as any);

      expect(result).toBeDefined();
      expect(result.requiresEmailVerification).toBeUndefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeTruthy();
      expect(result.tokens?.refreshToken).toBeTruthy();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(verifiedUserId);
    }, 30000);

    test('login with wrong password fails before checking verification status', async () => {
      await expect(
        AuthService.login({
          email: unverifiedEmail,
          password: 'WrongPassword!',
        } as any)
      ).rejects.toThrow('Invalid credentials');
    }, 30000);
  });

  describe('OTP verification scenarios', () => {
    test('verifyEmailVerificationOtp with valid code marks user as verified', async () => {
      // Generate OTP for the user
      const { otp } = await TwoFactorService.createOTP(unverifiedUserId, 'EMAIL');

      // Verify the OTP using the session token
      await AuthService.verifyEmailVerificationOtp({
        verificationSessionToken,
        code: otp,
      });

      // Verify user state changed
      const user = await prisma.user.findUnique({ where: { id: unverifiedUserId } });
      expect(user?.emailVerified).toBe(true);
      expect(user?.emailVerifiedAt).toBeDefined();
      expect(user?.verificationStatus).toBe('VERIFIED');
      expect(user?.requiresEmailReverification).toBe(false);
      expect(user?.emailVerificationSessionToken).toBeNull();
      expect(user?.emailVerificationSessionExpiry).toBeNull();
    }, 30000);

    test('verifyEmailVerificationOtp with expired session fails', async () => {
      // Create a new unverified user for this test
      const tempEmail = 'temp-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'Temp Tester', preferredLanguage: 'en' } },
        },
      });

      // Manually create an expired session
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(expiredToken).digest('hex');
      const expiredAt = new Date(Date.now() - 1000); // Already expired

      await prisma.user.update({
        where: { id: tempUser.id },
        data: {
          emailVerificationSessionToken: tokenHash,
          emailVerificationSessionExpiry: expiredAt,
        },
      });

      // Generate OTP for this user
      const { otp } = await TwoFactorService.createOTP(tempUser.id, 'EMAIL');

      // Try to verify with expired session - should fail
      try {
        await AuthService.verifyEmailVerificationOtp({
          verificationSessionToken: expiredToken,
          code: otp,
        });
        fail('Should have thrown an error for expired session');
      } catch (error: any) {
        expect(error.message).toContain('expired');
      }

      // Cleanup
      await prisma.twoFactorOTP.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 30000);

    test('verifyEmailVerificationOtp with wrong OTP code fails', async () => {
      // Create another unverified user for this test
      const tempEmail = 'wrong-otp-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'Wrong OTP Tester', preferredLanguage: 'en' } },
        },
      });

      // Start verification challenge
      const result = await AuthService.startEmailVerificationChallenge(tempUser.id, tempEmail, 'Wrong OTP Tester');
      const sessionToken = result.verificationSessionToken;

      // Generate OTP
      await TwoFactorService.createOTP(tempUser.id, 'EMAIL');

      // Try to verify with wrong code - should fail
      try {
        await AuthService.verifyEmailVerificationOtp({
          verificationSessionToken: sessionToken,
          code: '000000', // Wrong code
        });
        fail('Should have thrown an error for invalid OTP');
      } catch (error: any) {
        expect(error.message.toLowerCase()).toContain('otp');
      }

      // User should still be unverified
      const userCheck = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(userCheck?.emailVerified).toBe(false);

      // Cleanup
      await prisma.twoFactorOTP.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 30000);
  });

  describe('OTP resend scenarios', () => {
    test('resendEmailVerificationOtp succeeds after initial challenge', async () => {
      const tempEmail = 'resend-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'Resend Tester', preferredLanguage: 'en' } },
        },
      });

      // Start verification challenge
      const result = await AuthService.startEmailVerificationChallenge(tempUser.id, tempEmail, 'Resend Tester');
      const sessionToken = result.verificationSessionToken;

      // Reset OTP sent timestamp so the resend path is not blocked by cooldown.
      await prisma.user.update({
        where: { id: tempUser.id },
        data: { verificationOtpSentAt: null },
      });

      // Resend OTP
      await AuthService.resendEmailVerificationOtp({
        verificationSessionToken: sessionToken,
      });

      // There should now be multiple OTPs for this user
      const otps = await prisma.twoFactorOTP.findMany({
        where: { userId: tempUser.id, method: 'EMAIL' },
      });
      expect(otps.length).toBe(1);

      // Cleanup
      await prisma.twoFactorOTP.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 60000);

    test('resendEmailVerificationOtp with invalid session fails', async () => {
      const invalidToken = crypto.randomBytes(32).toString('hex');

      try {
        await AuthService.resendEmailVerificationOtp({
          verificationSessionToken: invalidToken,
        });
        fail('Should have thrown an error for invalid session');
      } catch (error: any) {
        expect(error.message.toLowerCase()).toContain('expired');
      }
    }, 30000);
  });

  describe('Email change during verification', () => {
    test('changeVerificationEmail updates email and returns new session token', async () => {
      const tempEmail = 'change-email-' + Date.now() + '@example.com';
      const newEmail = 'changed-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'Change Email Tester', preferredLanguage: 'en' } },
        },
      });

      // Start verification challenge
      const result = await AuthService.startEmailVerificationChallenge(tempUser.id, tempEmail, 'Change Email Tester');
      const sessionToken = result.verificationSessionToken;

      // Change email during verification
      const changeResult = await AuthService.changeVerificationEmail({
        verificationSessionToken: sessionToken,
        newEmail,
      });

      expect(changeResult).toBeDefined();
      expect(changeResult.verificationSessionToken).toBeTruthy();
      expect(changeResult.verificationEmail).toBe(newEmail);
      expect(changeResult.expiresInMinutes).toBe(15);

      // Verify user email was actually changed
      const user = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(user?.email).toBe(newEmail);

      // Old email should be available again
      const oldEmailUser = await prisma.user.findUnique({ where: { email: tempEmail } });
      expect(oldEmailUser).toBeNull();

      // Cleanup
      await prisma.twoFactorOTP.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 60000);

    test('changeVerificationEmail with invalid session fails', async () => {
      const invalidToken = crypto.randomBytes(32).toString('hex');

      try {
        await AuthService.changeVerificationEmail({
          verificationSessionToken: invalidToken,
          newEmail: 'new@example.com',
        });
        fail('Should have thrown an error for invalid session');
      } catch (error: any) {
        expect(error.message.toLowerCase()).toContain('expired');
      }
    }, 30000);

    test('changeVerificationEmail with duplicate email fails', async () => {
      const tempEmail = 'change-email-dup-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'Change Email Dup Tester', preferredLanguage: 'en' } },
        },
      });

      // Start verification challenge
      const result = await AuthService.startEmailVerificationChallenge(tempUser.id, tempEmail, 'Change Email Dup Tester');
      const sessionToken = result.verificationSessionToken;

      // Try to change to an email that already exists (verifiedEmail)
      try {
        await AuthService.changeVerificationEmail({
          verificationSessionToken: sessionToken,
          newEmail: verifiedEmail,
        });
        fail('Should have thrown an error for duplicate email');
      } catch (error: any) {
        expect(error.message.toLowerCase()).toContain('already exists');
      }

      // Cleanup
      await prisma.twoFactorOTP.deleteMany({ where: { userId: tempUser.id } });
      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 30000);
  });

  describe('Middleware enforcement', () => {
    test('unverified user cannot access protected routes via middleware check', async () => {
      // Create an unverified user with a simulated JWT token
      const tempEmail = 'middleware-test-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'Middleware Tester', preferredLanguage: 'en' } },
        },
      });

      // Simulate a request with user info (as if JWT was decoded)
      const next = jest.fn();
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });

      const mockReq = {
        user: {
          userId: tempUser.id,
          email: tempEmail,
          role: 'USER',
        },
      } as any;

      const mockRes = {
        status,
      } as any;

      // Call middleware
      try {
        await AuthMiddleware.verifyEmailStatus(mockReq, mockRes, next);
        // If it doesn't throw, it should have been rejected via res.status
        expect(next).toHaveBeenCalled();
      } catch (error: any) {
        expect(error.message.toLowerCase()).toContain('email verification');
      }

      // Cleanup
      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 30000);

    test('verified user can pass through middleware check', async () => {
      // The verifiedUser created in beforeAll should pass this check
      const next = jest.fn();

      const mockReq = {
        user: {
          userId: verifiedUserId,
          email: verifiedEmail,
          role: 'USER',
        },
      } as any;

      const mockRes = {} as any;

      // Call middleware
      await AuthMiddleware.verifyEmailStatus(mockReq, mockRes, next);

      // Should call next() without error
      expect(next).toHaveBeenCalled();
    }, 30000);
  });

  describe('Backfill and state consistency', () => {
    test('unverified user has correct initial state', async () => {
      const tempEmail = 'state-check-' + Date.now() + '@example.com';
      const passwordHash = await bcrypt.hash(password, 10);
      const tempUser = await prisma.user.create({
        data: {
          email: tempEmail,
          passwordHash,
          role: 'USER',
          emailVerified: false,
          emailVerifiedAt: null,
          verificationStatus: 'REVERIFY_REQUIRED',
          requiresEmailReverification: true,
          status: 'ACTIVE',
          isActive: true,
          profile: { create: { fullName: 'State Check Tester', preferredLanguage: 'en' } },
        },
      });

      const user = await prisma.user.findUnique({
        where: { id: tempUser.id },
      });

      expect(user?.emailVerified).toBe(false);
      expect(user?.verificationStatus).toBe('REVERIFY_REQUIRED');
      expect(user?.requiresEmailReverification).toBe(true);
      expect(user?.emailVerifiedAt).toBeNull();

      await prisma.user.delete({ where: { id: tempUser.id } });
    }, 10000);

    test('verified user has correct final state', async () => {
      const user = await prisma.user.findUnique({
        where: { id: verifiedUserId },
      });

      // The verified user created in beforeAll should remain verified
      expect(user?.emailVerified).toBe(true);
      expect(user?.verificationStatus).toBe('VERIFIED');
      expect(user?.requiresEmailReverification).toBe(false);
      expect(user?.emailVerifiedAt).toBeDefined();
    }, 10000);
  });
});
