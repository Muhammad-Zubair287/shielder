import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/common/logger/logger';
import { BadRequestError } from '@/common/errors/api.error';
import { emailService } from '@/common/services/email.service';

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

interface ContactSubmissionInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  captchaToken: string;
}

interface ContactAttachmentMetadata {
  originalName: string;
  mimeType: string;
  size: number;
}

interface CaptchaVerificationResult {
  valid: boolean;
  reason?: string;
}

type AdminRecipient = {
  email: string;
  profile: { fullName: string | null } | null;
};

type JsonRecord = Record<string, unknown>;

class ContactService {
  private async verifyCaptchaToken(token: string, remoteIp?: string): Promise<CaptchaVerificationResult> {
    const secret = env.contactCaptchaSecret;

    if (!secret) {
      // Local/dev fallback to keep the form testable without a CAPTCHA provider.
      if (
        process.env.NODE_ENV !== 'production' &&
        (token === 'dev-human-verified' || token.startsWith('captcha_') || token.startsWith('captcha_fallback_'))
      ) {
        return { valid: true };
      }
      return { valid: false, reason: 'CAPTCHA is not configured on the server.' };
    }

    try {
      const body = new URLSearchParams({
        secret,
        response: token,
      });

      if (remoteIp) {
        body.append('remoteip', remoteIp);
      }

      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        return { valid: false, reason: 'CAPTCHA verification request failed.' };
      }

      const payload = (await response.json()) as { success?: boolean; ['error-codes']?: string[] };

      if (!payload.success) {
        return {
          valid: false,
          reason: payload['error-codes']?.join(', ') || 'CAPTCHA verification failed.',
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('CAPTCHA verification error', error);
      return { valid: false, reason: 'CAPTCHA verification failed due to server error.' };
    }
  }

  private buildAttachmentMetadata(file?: Express.Multer.File): ContactAttachmentMetadata | null {
    if (!file) {
      return null;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestError('Attachment must be 5MB or smaller.');
    }

    if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
      throw new BadRequestError('Attachment type is not supported.');
    }

    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async submitContactForm(
    input: ContactSubmissionInput,
    remoteIp?: string,
    userAgent?: string,
    file?: Express.Multer.File
  ): Promise<{ id: string }> {
    const captchaResult = await this.verifyCaptchaToken(input.captchaToken, remoteIp);

    if (!captchaResult.valid) {
      throw new BadRequestError(captchaResult.reason || 'CAPTCHA verification failed.');
    }

    const attachment = this.buildAttachmentMetadata(file);

    const attachmentJson: JsonRecord | null = attachment
      ? {
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
        }
      : null;

    const changePayload: JsonRecord = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || '',
      subject: input.subject,
      message: input.message,
      attachment: attachmentJson,
    };

    // Persist contact data for admin workflows while preserving existing AuditLog tracking.
    const contact = await prisma.contact.create({
      data: {
        name: `${input.firstName} ${input.lastName}`.trim(),
        email: input.email,
        phone: input.phone || null,
        subject: input.subject,
        message: input.message,
        fileUrl: attachment?.originalName || null,
        status: 'PENDING',
      },
      select: {
        id: true,
      },
    });

    const record = await prisma.auditLog.create({
      data: {
        action: 'CONTACT_SUBMISSION',
        entityType: 'CONTACT',
        entityId: contact.id,
        changes: changePayload as any,
        ipAddress: remoteIp,
        userAgent,
      },
    });

    const adminRecipients = (await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        deletedAt: null,
      },
      select: {
        email: true,
        profile: {
          select: {
            fullName: true,
          },
        },
      },
    })) as AdminRecipient[];

    void Promise.allSettled(
      adminRecipients.map((recipient) =>
        emailService.sendEmail({
          to: recipient.email,
          subject: `[Shielder] New contact submission: ${input.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
              <h2 style="margin: 0 0 16px; color: #0d1637;">New contact submission</h2>
              <p style="margin: 0 0 12px;"><strong>Name:</strong> ${input.firstName} ${input.lastName}</p>
              <p style="margin: 0 0 12px;"><strong>Email:</strong> ${input.email}</p>
              <p style="margin: 0 0 12px;"><strong>Phone:</strong> ${input.phone || '—'}</p>
              <p style="margin: 0 0 12px;"><strong>Subject:</strong> ${input.subject}</p>
              <p style="margin: 0 0 12px;"><strong>Message:</strong></p>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; white-space: pre-wrap;">${input.message}</div>
            </div>
          `,
        })
      )
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error('Failed to send contact notification email', {
            recipient: adminRecipients[index]?.email,
            error: result.reason,
          });
        }
      });
    });

    // Keep response shape unchanged; return a stable id for the submission.
    return { id: record.id || contact.id };
  }
}

export default new ContactService();
