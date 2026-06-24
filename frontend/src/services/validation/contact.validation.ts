import {
  CONTACT_ALLOWED_FILE_TYPES,
  CONTACT_PAGE_LIMITS,
} from '@/app/contact/contact.constants';
import {
  ContactFormValues,
  ContactValidationError,
} from '@/app/contact/contact.types';

export function validateContactForm(
  values: ContactFormValues,
  attachment: File | null,
  t?: (key: string) => string
): ContactValidationError[] {
  const errors: ContactValidationError[] = [];

  // FIX: Changed t('contact.xxx') -> t('contactXxx') to match the flat
  // camelCase keys actually defined in en.json / ar.json. The old dot-notation
  // keys didn't exist in the translation files, so i18next returned the raw
  // key string (e.g. "contact.attachmentTooLarge") as a truthy value —
  // the `|| fallback` never triggered and users saw the raw key on screen.

  if (!values.firstName.trim()) errors.push({ field: 'firstName', message: t?.('contactFirstNameRequired') || 'First name is required.' });
  if (!values.lastName.trim()) errors.push({ field: 'lastName', message: t?.('contactLastNameRequired') || 'Last name is required.' });

  const emailValue = values.email.trim();
  if (!emailValue) {
    errors.push({ field: 'email', message: t?.('contactEmailRequired') || 'Email is required.' });
  } else if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
    errors.push({ field: 'email', message: t?.('contactInvalidEmailAddress') || 'Enter a valid email address.' });
  }

  if (values.message.length > CONTACT_PAGE_LIMITS.MAX_MESSAGE_CHARACTERS) {
    errors.push({
      field: 'message',
      message: t?.('contactMessageTooLong') || `Message must be ${CONTACT_PAGE_LIMITS.MAX_MESSAGE_CHARACTERS} characters or less.`,
    });
  }

  if (!values.captchaConfirmed) {
    errors.push({ field: 'captchaConfirmed', message: t?.('contactCaptchaRequired') || 'Please confirm you are not a robot.' });
  }

  if (attachment) {
    const maxBytes = CONTACT_PAGE_LIMITS.MAX_ATTACHMENT_MB * 1024 * 1024;
    if (attachment.size > maxBytes) {
      errors.push({
        field: 'attachment',
        message: t?.('contactAttachmentTooLarge') || `Attachment must be under ${CONTACT_PAGE_LIMITS.MAX_ATTACHMENT_MB}MB.`,
      });
    }
    if (!CONTACT_ALLOWED_FILE_TYPES.includes(attachment.type as (typeof CONTACT_ALLOWED_FILE_TYPES)[number])) {
      errors.push({ field: 'attachment', message: t?.('contactAttachmentTypeNotSupported') || 'Attachment type is not supported.' });
    }
  }

  return errors;
}