/**
 * Seed Super Admin Account
 * Run: npx tsx src/scripts/seed-super-admin.ts
 */

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Super Admin...');

  const email = 'superadmin@shielder.com';
  const password = 'SuperAdmin@2026';

  // Check if super admin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('✅ Super Admin already exists:', email);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create super admin
  const superAdmin = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      profile: {
        create: {
          fullName: 'Super Admin',
          phoneNumber: '+0000000000',
          address: 'Main Command Center',
          preferredLanguage: 'en',
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log('✅ Super Admin created successfully!');
  console.log('\n📧 Email:', email);
  console.log('🔑 Password:', password);
  console.log('👤 Role:', superAdmin.role);
  console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
