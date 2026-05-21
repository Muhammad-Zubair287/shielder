import { prisma } from '../src/config/database';
import { TwoFactorService } from '../src/modules/auth/twofa.service';
import { logger } from '../src/common/logger/logger';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/send-otp-to-email.ts user@example.com');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(2);
  }

  try {
    const { otp } = await TwoFactorService.createOTP(user.id, 'EMAIL');
    logger.info(`Generated OTP for ${email} (dev-only log): ${otp}`);
    await TwoFactorService.sendOTPEmail(email, otp);
    console.log('OTP send attempted. Check Brevo events and inbox.');
    process.exit(0);
  } catch (err) {
    console.error('Error sending OTP to user:', err);
    process.exit(3);
  }
}

main().catch((err) => {
  console.error('Script error', err);
  process.exit(4);
});
