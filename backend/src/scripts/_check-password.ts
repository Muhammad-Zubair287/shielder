import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { email: true, passwordHash: true },
  });

  if (!user) {
    console.log('No super admin found in database.');
    return;
  }

  console.log('Email:', user.email);

  // Test all known candidate passwords
  const candidates = [
    'Super@123',
    'SuperAdmin@2026',
    'superadmin@2026',
    'SuperAdmin@123',
    'Admin@2026',
    'Admin@123',
    'Shielder@2026',
    'shielder@2026',
  ];

  for (const pwd of candidates) {
    const match = await bcrypt.compare(pwd, user.passwordHash);
    if (match) {
      console.log('✅ Current password is:', pwd);
      return;
    }
  }

  console.log('❌ Password was changed to something not in the candidate list.');
  console.log('   Use the reset script to set a new password:');
  console.log('   npm run seed:super-admin (will skip if exists)');
  console.log('   OR run: npx tsx src/scripts/reset-superadmin.ts');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
