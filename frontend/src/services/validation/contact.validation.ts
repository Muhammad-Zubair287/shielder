import {
  CONTACT_ALLOWED_FILE_TYPES,
  CONTACT_PAGE_LIMITS,
} from '@/app/contact/contact.constants';
import {
  ContactFormValues,
  ContactValidationError,
} from '@/app/contact/contact.types';

// ── Security patterns (mirror backend textNoHtml + sanitize middleware) ────────
const UNSAFE_PATTERNS: RegExp[] = [
  /[\u0000-\u001F\u007F]/,                                                                // Control characters
  /<[^>]+>/,                                                                               // HTML tags
  /javascript:\s*/i,                                                                       // JS protocol
  /on\w+\s*=/i,                                                                            // Event handlers (onerror=, onload=, etc.)
  /(?:'|")\s*(?:or|and)\s*(?:'|")?\s*(?:\d+|true)/i,                                    // SQL boolean injection (' OR '1'='1)
  /\b(?:union\s+select|drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b/i, // SQL DDL/DML keywords
];

// Name fields: Unicode letters, spaces, apostrophes ('' and '), hyphens only
const NAME_VALID_RE = /^[\p{L}\s''\-]+$/u;
const NAME_HAS_LETTER_RE = /[\p{L}]/u;

function hasUnsafeContent(value: string): boolean {
  return UNSAFE_PATTERNS.some(p => p.test(value));
}

function isInvalidName(value: string): boolean {
  if (!value) return false;
  return !NAME_VALID_RE.test(value) || !NAME_HAS_LETTER_RE.test(value);
}

/**
 * Real-time per-field validator used by the onChange handler.
 * Security violations take priority over max-length feedback.
 */
export function validateContactField(
  key: keyof ContactFormValues | string,
  value: string,
  maxLength: number | undefined,
  t?: (key: string) => string,
): string | null {
  if (key === 'firstName' && value.trim()) {
    if (hasUnsafeContent(value) || isInvalidName(value.trim())) {
      return t?.('contactFirstNameInvalid') ?? 'First name may only contain letters, spaces, hyphens, and apostrophes.';
    }
  }

  if (key === 'lastName' && value.trim()) {
    if (hasUnsafeContent(value) || isInvalidName(value.trim())) {
      return t?.('contactLastNameInvalid') ?? 'Last name may only contain letters, spaces, hyphens, and apostrophes.';
    }
  }

  if (key === 'message' && value.trim() && hasUnsafeContent(value)) {
    return t?.('contactMessageInvalid') ?? 'Message contains invalid or unsafe content.';
  }

  // Show max-length message when the user is at the character ceiling
  // (the maxLength HTML attribute prevents typing beyond it, so >= is the trigger)
  if (maxLength !== undefined && value.length >= maxLength) {
    return t?.('validation.maxLength') ?? 'Maximum character limit reached.';
  }

  return null;
}

export function validateContactForm(
  values: ContactFormValues,
  attachment: File | null,
  t?: (key: string) => string,
): ContactValidationError[] {
  const errors: ContactValidationError[] = [];

  const firstName = values.firstName.trim();
  if (!firstName) {
    errors.push({ field: 'firstName', message: t?.('contactFirstNameRequired') ?? 'First name is required.' });
  } else if (hasUnsafeContent(firstName) || isInvalidName(firstName)) {
    errors.push({ field: 'firstName', message: t?.('contactFirstNameInvalid') ?? 'First name may only contain letters, spaces, hyphens, and apostrophes.' });
  }

  const lastName = values.lastName.trim();
  if (!lastName) {
    errors.push({ field: 'lastName', message: t?.('contactLastNameRequired') ?? 'Last name is required.' });
  } else if (hasUnsafeContent(lastName) || isInvalidName(lastName)) {
    errors.push({ field: 'lastName', message: t?.('contactLastNameInvalid') ?? 'Last name may only contain letters, spaces, hyphens, and apostrophes.' });
  }

  const emailValue = values.email.trim();
  if (!emailValue) {
    errors.push({ field: 'email', message: t?.('contactEmailRequired') ?? 'Email is required.' });
  } else if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
    errors.push({ field: 'email', message: t?.('contactInvalidEmailAddress') ?? 'Enter a valid email address.' });
  }

  const message = values.message.trim();
  if (!message) {
    errors.push({ field: 'message', message: t?.('contactMessageRequired') ?? 'Message is required.' });
  } else if (hasUnsafeContent(message)) {
    errors.push({ field: 'message', message: t?.('contactMessageInvalid') ?? 'Message contains invalid or unsafe content.' });
  } else if (values.message.length > CONTACT_PAGE_LIMITS.MAX_MESSAGE_CHARACTERS) {
    errors.push({
      field: 'message',
      message: t?.('contactMessageTooLong') ?? `Message must be ${CONTACT_PAGE_LIMITS.MAX_MESSAGE_CHARACTERS} characters or less.`,
    });
  }

  if (!values.captchaConfirmed) {
    errors.push({ field: 'captchaConfirmed', message: t?.('contactCaptchaRequired') ?? 'Please confirm you are not a robot.' });
  }

  if (attachment) {
    const maxBytes = CONTACT_PAGE_LIMITS.MAX_ATTACHMENT_MB * 1024 * 1024;
    if (attachment.size > maxBytes) {
      errors.push({
        field: 'attachment',
        message: t?.('contactAttachmentTooLarge') ?? `Attachment must be under ${CONTACT_PAGE_LIMITS.MAX_ATTACHMENT_MB}MB.`,
      });
    }
    if (!CONTACT_ALLOWED_FILE_TYPES.includes(attachment.type as (typeof CONTACT_ALLOWED_FILE_TYPES)[number])) {
      errors.push({ field: 'attachment', message: t?.('contactAttachmentTypeNotSupported') ?? 'Attachment type is not supported.' });
    }
  }

  return errors;
}
