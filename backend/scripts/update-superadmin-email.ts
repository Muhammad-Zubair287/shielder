/**
 * Update the primary superadmin email without changing the password hash.
 *
 * Usage:
 *   npx ts-node scripts/update-superadmin-email.ts superadmin@shielder.com zubair.m1815@gmail.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [currentEmail, nextEmail] = process.argv.slice(2);

  if (!currentEmail || !nextEmail) {
    console.log('Usage: npx ts-node scripts/update-superadmin-email.ts <currentEmail> <nextEmail>');
    process.exit(1);
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email: currentEmail.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        profile: {
          select: { fullName: true },
        },
      },
    });

    if (!currentUser) {
      console.error(`User not found: ${currentEmail}`);
      process.exit(1);
    }

    if (currentUser.role !== 'SUPER_ADMIN') {
      console.error(`Refusing to update ${currentUser.email}: role is ${currentUser.role}, not SUPER_ADMIN.`);
      process.exit(1);
    }

    const existingTarget = await prisma.user.findUnique({
      where: { email: nextEmail.toLowerCase() },
      select: { id: true, email: true, role: true },
    });

    if (existingTarget && existingTarget.id !== currentUser.id) {
      console.error(`Target email already belongs to another account: ${existingTarget.email} (${existingTarget.role})`);
      process.exit(1);
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: { email: nextEmail.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    console.log('Updated superadmin email successfully.');
    console.log(`Old email: ${currentEmail}`);
    console.log(`New email: ${updated.email}`);
    console.log(`Role: ${updated.role}`);
    console.log(`Password hash preserved: ${updated.passwordHash === currentUser.passwordHash ? 'yes' : 'no'}`);
  } catch (error) {
    console.error('Failed to update superadmin email:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
