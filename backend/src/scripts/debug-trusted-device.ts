import { prisma } from '@/config/database';
import TrustedDeviceService from '@/modules/auth/trustedDevice.service';
import bcrypt from 'bcryptjs';

async function run() {
  try {
    const passwordHash = await bcrypt.hash('P@ssw0rd!', 10);
    const email = `debug-trusted-${Date.now()}@example.com`;
    const user = await prisma.user.create({ data: { email, passwordHash, role: 'ADMIN', emailVerified: true, status: 'ACTIVE', isActive: true, profile: { create: { fullName: 'Debug Tester' } } } });
    console.log('Created user', user.id);

    const token = await TrustedDeviceService.createTrustedDevice(user.id, 'dbg-device', 'dbg-agent', '127.0.0.1', 1);
    console.log('Created trusted device token:', token);

    const record = await TrustedDeviceService.verifyDeviceToken(token);
    console.log('Verified record:', !!record, record ? { id: record.id, token: record.token, expiresAt: record.expiresAt } : null);

    // cleanup
    await prisma.trustedDevice.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    console.log('Cleanup done');
    process.exit(0);
  } catch (err) {
    console.error('Error during debug run:', err);
    process.exit(1);
  }
}

run();
