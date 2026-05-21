/**
 * Script to list admin/superadmin users
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    });

    console.log('\n📋 Admin/Superadmin Accounts:\n');
    admins.forEach((admin) => {
      console.log(`  • ${admin.email}`);
      console.log(`    Role: ${admin.role}`);
      console.log(`    Name: ${admin.profile?.fullName || 'N/A'}`);
      console.log('');
    });

    if (admins.length === 0) {
      console.log('  No admin/superadmin accounts found in database.\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAdmins();
