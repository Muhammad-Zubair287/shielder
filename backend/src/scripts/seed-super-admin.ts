/**
 * Seed Super Admin Account
 * Run: npm run seed:super-admin
 *      npx tsx src/scripts/seed-super-admin.ts
 *
 * IDEMPOTENT / SINGLE SUPERADMIN RULES:
 * - If exactly one SUPER_ADMIN exists → do nothing
 * - If zero SUPER_ADMIN exist → create the configured account (if email free)
 * - If more than one SUPER_ADMIN exist → abort and report (no auto-delete)
 * - If the target email exists as a non-SUPER_ADMIN → abort (no role escalation)
 *
 * ⚠️ SECURITY NOTE:
 * Passwords are hashed with bcrypt (12 rounds) before storage.
 * NEVER store plain text passwords or update passwordHash without bcrypt.
 * This script never prints the password or password hash.
 */

import { PrismaClient, UserRole, UserStatus, EmailVerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'zubair.m1815@gmail.com';
const DEFAULT_PASSWORD = 'Super@123';
const BCRYPT_ROUNDS = 12;

class SeedAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedAbortError';
  }
}

async function main() {
  console.log('🌱 Seeding Super Admin (idempotent, single-account)...');

  const email = (process.env.SUPER_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  if (!email || !password) {
    throw new SeedAbortError('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD must not be empty.');
  }

  await prisma.$transaction(async (tx) => {
    const superAdmins = await tx.user.findMany({
      where: { role: UserRole.SUPER_ADMIN },
      select: {
        id: true,
        email: true,
        status: true,
        isActive: true,
        deletedAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (superAdmins.length > 1) {
      console.error('❌ Multiple SUPER_ADMIN accounts found. Aborting — no create/delete performed.');
      for (const sa of superAdmins) {
        console.error(
          `   - ${sa.email} | active=${sa.isActive} | status=${sa.status} | softDeleted=${sa.deletedAt !== null}`
        );
      }
      throw new SeedAbortError('Manual review required to keep exactly one SuperAdmin.');
    }

    if (superAdmins.length === 1) {
      const existing = superAdmins[0];
      console.log('✅ Super Admin already exists. No changes made.');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Active: ${existing.isActive}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   Soft-deleted: ${existing.deletedAt !== null}`);
      console.log(`   Email verified: ${existing.emailVerified}`);
      if (!existing.isActive || existing.deletedAt || existing.status !== UserStatus.ACTIVE) {
        console.warn(
          '⚠️  Existing SuperAdmin may not be usable (inactive/soft-deleted/non-ACTIVE). Manual restore recommended — seed will not modify it.'
        );
      }
      return;
    }

    // Zero SUPER_ADMIN accounts — check email conflict before create
    const emailOwner = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (emailOwner) {
      console.error('❌ Target email already belongs to a non-SUPER_ADMIN account. Aborting.');
      console.error(`   Email: ${emailOwner.email}`);
      console.error(`   Role: ${emailOwner.role}`);
      console.error(`   Active: ${emailOwner.isActive}`);
      console.error(`   Soft-deleted: ${emailOwner.deletedAt !== null}`);
      throw new SeedAbortError('Manual review required — will not escalate role or create a duplicate.');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const superAdmin = await tx.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationStatus: EmailVerificationStatus.VERIFIED,
        profile: {
          create: {
            fullName: 'Super Admin',
            phoneNumber: '+0000000000',
            address: 'Main Command Center',
            preferredLanguage: 'en',
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        verificationStatus: true,
      },
    });

    console.log('✅ Super Admin created successfully.');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   Status: ${superAdmin.status}`);
    console.log(`   Active: ${superAdmin.isActive}`);
    console.log(`   Email verified: ${superAdmin.emailVerified}`);
    console.log('⚠️  Change the password after first successful login.');
  });
}

main()
  .catch((e) => {
    if (e instanceof SeedAbortError) {
      console.error(`❌ ${e.message}`);
    } else {
      console.error('❌ Error seeding super admin:', e instanceof Error ? e.message : e);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
