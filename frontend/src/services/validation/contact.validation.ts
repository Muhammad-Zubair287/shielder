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

  if (!values.firstName.trim()) errors.push({ field: 'firstName', message: t?.('contact.firstNameRequired') || 'First name is required.' });
  if (!values.lastName.trim()) errors.push({ field: 'lastName', message: t?.('contact.lastNameRequired') || 'Last name is required.' });

  const emailValue = values.email.trim();
  if (!emailValue) {
    errors.push({ field: 'email', message: t?.('contact.emailRequired') || 'Email is required.' });
  } else if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
    errors.push({ field: 'email', message: t?.('contact.invalidEmailAddress') || 'Enter a valid email address.' });
  }

  if (values.message.length > CONTACT_PAGE_LIMITS.MAX_MESSAGE_CHARACTERS) {
    errors.push({
      field: 'message',
      message: t?.('contact.messageTooLong') || `Message must be ${CONTACT_PAGE_LIMITS.MAX_MESSAGE_CHARACTERS} characters or less.`,
    });
  }

  if (!values.captchaConfirmed) {
    errors.push({ field: 'captchaConfirmed', message: t?.('contact.captchaRequired') || 'Please confirm you are not a robot.' });
  }

  if (attachment) {
    const maxBytes = CONTACT_PAGE_LIMITS.MAX_ATTACHMENT_MB * 1024 * 1024;
    if (attachment.size > maxBytes) {
      errors.push({
        field: 'attachment',
        message: t?.('contact.attachmentTooLarge') || `Attachment must be under ${CONTACT_PAGE_LIMITS.MAX_ATTACHMENT_MB}MB.`,
      });
    }
    if (!CONTACT_ALLOWED_FILE_TYPES.includes(attachment.type as (typeof CONTACT_ALLOWED_FILE_TYPES)[number])) {
      errors.push({ field: 'attachment', message: t?.('contact.attachmentTypeNotSupported') || 'Attachment type is not supported.' });
    }
  }

  return errors;
}
