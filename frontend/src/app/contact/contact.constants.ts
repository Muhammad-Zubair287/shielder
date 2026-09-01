export const CONTACT_PAGE_LIMITS = {
  MAX_MESSAGE_CHARACTERS: 5000,
  MAX_ATTACHMENT_MB: 5,
} as const;

export const CONTACT_ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const CONTACT_SUBJECTS = [
  'General Inquiry',
  'Sales',
  'Support',
  'Technical',
  'Other',
] as const;

export const CONTACT_INFO = {
  phoneDisplay: '+1 (555) 123-4567',
  phoneHref: 'tel:+15551234567',
  address: '123 Filter Street, Auto City, 12345 United States',
  whatsAppHref: 'https://wa.me/15551234567',
  mapEmbedUrl:
    'https://www.google.com/maps?q=123+Filter+Street,+Auto+City,+United+States&output=embed',
} as const;
