import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/common/logger/logger';
import { BadRequestError } from '@/common/errors/api.error';
import { storageService } from '@/common/storage/storage.service';
import { validateImageBuffer } from '@/common/storage/image-validation.service';
import NotificationService from '@/modules/notification/notification.service';
import { NotificationType, UserRole } from '@prisma/client';
import { isPhoneUserAgent } from './contact-device.util';

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

  private getContactAttachmentExtension(mimeType: string): string | null {
    switch (mimeType) {
      case 'application/pdf':
        return '.pdf';
      case 'application/msword':
        return '.doc';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '.docx';
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      default:
        return null;
    }
  }

  private buildAttachmentMetadata(file?: Express.Multer.File): ContactAttachmentMetadata | null {
    if (!file) {
      return null;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestError('storage.attachmentTooLarge');
    }

    if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
      throw new BadRequestError('storage.attachmentInvalidType');
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
    // CAPTCHA is mandatory for non-phone clients. Phone clients are detected from
    // the request User-Agent only — never from a client-supplied body flag.
    const phoneClient = isPhoneUserAgent(userAgent);
    const captchaToken = input.captchaToken?.trim();

    if (!phoneClient) {
      if (!captchaToken) {
        throw new BadRequestError('contact.captchaRequired');
      }

      const captchaResult = await this.verifyCaptchaToken(captchaToken, remoteIp);
      if (!captchaResult.valid) {
        throw new BadRequestError('contact.captchaFailed');
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

    let storedAttachmentRef: string | null = null;
    try {
      // Persist contact data for admin workflows while preserving existing AuditLog tracking.
      // Store the binary first; if DB write fails, delete the newly stored object.
      if (file && attachment) {
        let extension = this.getContactAttachmentExtension(attachment.mimeType);
        let contentType = attachment.mimeType;

        // Centralized magic-byte validation for images.
        if (attachment.mimeType.startsWith('image/')) {
          const kind = validateImageBuffer({
            buffer: file.buffer as Buffer,
            declaredMimeType: attachment.mimeType,
            byteSize: file.size,
            // Contact accepts only PNG/JPEG here (per ALLOWED_FILE_TYPES).
            allowedMimeTypes: ['image/png', 'image/jpeg'],
            maxBytes: MAX_ATTACHMENT_BYTES,
          });
          extension = kind.extension;
          contentType = kind.mimeType;
        }

        if (!extension) {
          throw new BadRequestError('storage.attachmentInvalidType');
        }

        const stored = await storageService.storeFileFromBuffer({
          scope: 'contactAttachments',
          buffer: file.buffer as Buffer,
          contentType,
          extension,
        });
        storedAttachmentRef = stored.ref;
      }

      const contact = await prisma.contact.create({
        data: {
          name: `${input.firstName} ${input.lastName}`.trim(),
          email: input.email,
          phone: input.phone || null,
          subject: input.subject,
          message: input.message,
          fileUrl: storedAttachmentRef,
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
    } catch (error) {
      if (storedAttachmentRef) {
        // DB failure compensation: delete the newly stored object.
        void storageService.deleteByRef(storedAttachmentRef);
      }
      throw error;
    }
  }
}

export default new ContactService();
