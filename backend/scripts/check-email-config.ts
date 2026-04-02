import { env } from '../src/config/env';
import { emailService } from '../src/common/services/email.service';

function logConfigSummary(): void {
  const provider = (env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  const safeSummary = {
    provider,
    fromName: env.EMAIL_FROM_NAME,
    fromAddress: env.EMAIL_FROM_ADDRESS,
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT,
    smtpSecure: env.SMTP_SECURE,
    smtpUserConfigured: Boolean(env.SMTP_USER),
    smtpPasswordConfigured: Boolean(env.SMTP_PASSWORD),
    sendgridConfigured: Boolean(env.SENDGRID_API_KEY),
    sesConfigured: Boolean(env.AWS_SES_ACCESS_KEY && env.AWS_SES_SECRET_KEY),
  };

  console.log('Email configuration summary:');
  console.table(safeSummary);
}

async function main(): Promise<void> {
  logConfigSummary();

  const provider = (env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  if (provider === 'smtp' && (!env.SMTP_USER || !env.SMTP_PASSWORD)) {
    console.error('SMTP provider selected but SMTP_USER/SMTP_PASSWORD are missing.');
    process.exit(1);
  }

  if (provider === 'sendgrid' && !env.SENDGRID_API_KEY) {
    console.error('SendGrid provider selected but SENDGRID_API_KEY is missing.');
    process.exit(1);
  }

  if (provider === 'ses' && (!env.AWS_SES_ACCESS_KEY || !env.AWS_SES_SECRET_KEY)) {
    console.error('SES provider selected but AWS SES credentials are missing.');
    process.exit(1);
  }

  const connected = await emailService.verifyConnection();
  if (!connected) {
    console.error('Email connection verification failed.');
    process.exit(1);
  }

  console.log('Email configuration check passed.');
}

main().catch((error) => {
  console.error('Email configuration check failed with exception:', error);
  process.exit(1);
});
