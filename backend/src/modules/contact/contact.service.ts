import { prisma } from '@/config/database';
import { logger } from '@/common/logger/logger';
import { BadRequestError } from '@/common/errors/api.error';
import { Prisma } from '@prisma/client';

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

class ContactService {
  private async verifyCaptchaToken(token: string, remoteIp?: string): Promise<CaptchaVerificationResult> {
    const secret = process.env.CONTACT_CAPTCHA_SECRET;

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

    const attachmentJson: Prisma.InputJsonObject | null = attachment
      ? {
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
        }
      : null;

    const changePayload: Prisma.InputJsonObject = {
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
        changes: changePayload,
        ipAddress: remoteIp,
        userAgent,
      },
    });

    // Keep response shape unchanged; return a stable id for the submission.
    return { id: record.id || contact.id };
  }
}

export default new ContactService();
