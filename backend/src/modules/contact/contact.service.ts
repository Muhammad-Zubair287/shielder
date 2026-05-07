import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/common/logger/logger';
import { BadRequestError } from '@/common/errors/api.error';
import { NotificationService } from '@/modules/notification/notification.service';
import { NotificationType, UserRole } from '@prisma/client';

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
  captchaToken?: string;
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

type JsonRecord = Record<string, unknown>;

class ContactService {
  private isPhoneClient(userAgent?: string): boolean {
    if (!userAgent) return false;
    return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  }

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
    const phoneClient = this.isPhoneClient(userAgent);
    const captchaToken = input.captchaToken?.trim();

    if (!phoneClient) {
      if (!captchaToken) {
        throw new BadRequestError('Please confirm you are not a robot.');
      }

      const captchaResult = await this.verifyCaptchaToken(captchaToken, remoteIp);
      if (!captchaResult.valid) {
        throw new BadRequestError(captchaResult.reason || 'CAPTCHA verification failed.');
      }
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

    // Notify all admins and super admins via in-app notification
    void NotificationService.notify({
      type: NotificationType.NEW_INQUIRY,
      title: 'New Customer Inquiry',
      message: `New inquiry from ${input.firstName} ${input.lastName}: ${input.subject}`,
      module: 'CONTACT',
      roleTarget: UserRole.SUPER_ADMIN,
      global: true, // Also target super admins
      relatedId: contact.id,
      metadata: {
        contactId: contact.id,
        senderName: `${input.firstName} ${input.lastName}`,
        subject: input.subject,
      },
      sendEmail: false, // External email disabled as per requirement
    });

    // Notify normal admins as well
    void NotificationService.notify({
      type: NotificationType.NEW_INQUIRY,
      title: 'New Customer Inquiry',
      message: `New inquiry from ${input.firstName} ${input.lastName}: ${input.subject}`,
      module: 'CONTACT',
      roleTarget: UserRole.ADMIN,
      relatedId: contact.id,
      metadata: {
        contactId: contact.id,
      },
      sendEmail: false,
    });

    // Keep response shape unchanged; return a stable id for the submission.
    return { id: record.id || contact.id };
  }
}

export default new ContactService();
