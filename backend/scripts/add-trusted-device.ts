/**
 * Script to add current device as trusted device for local development
 * Usage: npx ts-node scripts/add-trusted-device.ts <email>
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTrustedDevice(email: string) {
  try {
    console.log(`\n🔍 Looking for user: ${email}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ User found: ${user.profile?.fullName || user.email} (${user.role})`);

    // Check if user is admin or superadmin
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      console.error(`❌ Only ADMIN and SUPER_ADMIN users can have trusted devices`);
      process.exit(1);
    }

    // Create trusted device
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const device = await prisma.trustedDevice.create({
      data: {
        userId: user.id,
        token,
        name: 'MacBook (Development)',
        deviceInfo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipAddress: 'localhost',
        expiresAt,
      },
    });

    console.log(`\n✅ Trusted device created!`);
    console.log(`\n📱 Device Details:`);
    console.log(`   Name: ${device.name}`);
    console.log(`   Expires: ${expiresAt.toLocaleString()}`);
    console.log(`   Token: ${token}`);

    console.log(`\n🍪 Set this cookie to skip 2FA on login:`);
    console.log(`   Name: trustedDeviceToken`);
    console.log(`   Value: ${token}`);
    console.log(`   HttpOnly: true`);
    console.log(`   Secure: false (for localhost)`);
    console.log(`   SameSite: lax`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);

    console.log(`\n✅ Ready! You can now login without 2FA from this device.`);
    console.log(`   Next login attempt will auto-use this trusted device.\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line args
const email = process.argv[2];

if (!email) {
  console.log(`\nUsage: npx ts-node scripts/add-trusted-device.ts <email>`);
  console.log(`\nExample: npx ts-node scripts/add-trusted-device.ts superadmin@example.com\n`);
  process.exit(1);
}

addTrustedDevice(email);
