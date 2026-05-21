import { env } from '../src/config/env';
import { emailService } from '../src/common/services/email.service';

async function main() {
  const to = process.argv[2] || env.EMAIL_FROM_ADDRESS || '';
  if (!to) {
    console.error('Usage: npx ts-node scripts/send-test-email.ts <recipient-email>');
    process.exit(1);
  }

  const subject = 'Shielder Platform — Test Email';
  const html = `
    <p>Hi — this is a <strong>test</strong> email from Shielder backend.</p>
    <p>If you received this, the mailer is configured correctly.</p>
    <p>Time: ${new Date().toISOString()}</p>
  `;

  console.log(`Sending test email to ${to} from ${env.EMAIL_FROM_ADDRESS}...`);
  const ok = await emailService.sendEmail({ to, subject, html });

  if (ok) {
    console.log('✅ Test email sent (Brevo accepted request). Check inbox/spam.');
    process.exit(0);
  }

  console.error('❌ Test email failed to send. Check logs above.');
  process.exit(2);
}

main().catch((err) => {
  console.error('Test email script error:', err);
  process.exit(3);
});
