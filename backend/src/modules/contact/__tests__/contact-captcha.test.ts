/// <reference types="jest" />

const mockContactCreate = jest.fn();
const mockAuditLogCreate = jest.fn();
const mockNotify = jest.fn();
const mockStoreFileFromBuffer = jest.fn();
const mockDeleteByRef = jest.fn();

jest.mock('../../../config/database', () => ({
  prisma: {
    contact: { create: (...args: unknown[]) => mockContactCreate(...args) },
    auditLog: { create: (...args: unknown[]) => mockAuditLogCreate(...args) },
  },
}));

jest.mock('../../../config/env', () => ({
  env: {
    contactCaptchaSecret: 'test-recaptcha-secret',
  },
}));

jest.mock('../../../common/logger/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../common/storage/storage.service', () => ({
  storageService: {
    storeFileFromBuffer: (...args: unknown[]) => mockStoreFileFromBuffer(...args),
    deleteByRef: (...args: unknown[]) => mockDeleteByRef(...args),
  },
}));

jest.mock('../../../common/storage/image-validation.service', () => ({
  validateImageBuffer: jest.fn(),
}));

jest.mock('../../notification/notification.service', () => ({
  __esModule: true,
  default: {
    notify: (...args: unknown[]) => mockNotify(...args),
  },
}));

import contactService from '../contact.service';
import { isPhoneUserAgent } from '../contact-device.util';
import { BadRequestError } from '../../../common/errors/api.error';
import { t } from '../../../common/i18n';

const VALID_INPUT = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '+966501234567',
  subject: 'General Inquiry',
  message: 'Hello from the contact form.',
};

const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('isPhoneUserAgent', () => {
  it('detects common phone user agents', () => {
    expect(isPhoneUserAgent(MOBILE_UA)).toBe(true);
    expect(isPhoneUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36')).toBe(true);
    expect(isPhoneUserAgent('iPad')).toBe(true);
  });

  it('does not treat desktop UA as phone', () => {
    expect(isPhoneUserAgent(DESKTOP_UA)).toBe(false);
    expect(isPhoneUserAgent(undefined)).toBe(false);
    expect(isPhoneUserAgent('')).toBe(false);
  });
});

describe('ContactService CAPTCHA policy', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContactCreate.mockResolvedValue({ id: 'contact-1' });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit-1' });
    mockNotify.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('desktop: accepts a valid CAPTCHA token', async () => {
    const result = await contactService.submitContactForm(
      { ...VALID_INPUT, captchaToken: 'valid-google-token' },
      '127.0.0.1',
      DESKTOP_UA
    );

    expect(result).toEqual({ id: 'audit-1' });
    expect(global.fetch).toHaveBeenCalled();
    expect(mockContactCreate).toHaveBeenCalled();
  });

  it('desktop: rejects missing CAPTCHA token', async () => {
    await expect(
      contactService.submitContactForm(VALID_INPUT, '127.0.0.1', DESKTOP_UA)
    ).rejects.toMatchObject({ message: 'contact.captchaRequired', statusCode: 400 });

    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it('desktop: rejects invalid CAPTCHA token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    });

    await expect(
      contactService.submitContactForm(
        { ...VALID_INPUT, captchaToken: 'bad-token' },
        '127.0.0.1',
        DESKTOP_UA
      )
    ).rejects.toMatchObject({ message: 'contact.captchaFailed', statusCode: 400 });

    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it('mobile: accepts submission without CAPTCHA token', async () => {
    const result = await contactService.submitContactForm(VALID_INPUT, '127.0.0.1', MOBILE_UA);

    expect(result).toEqual({ id: 'audit-1' });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockContactCreate).toHaveBeenCalled();
  });

  it('mobile: accepts submission with a valid CAPTCHA token', async () => {
    const result = await contactService.submitContactForm(
      { ...VALID_INPUT, captchaToken: 'valid-google-token' },
      '127.0.0.1',
      MOBILE_UA
    );

    expect(result).toEqual({ id: 'audit-1' });
    // Mobile policy skips verification entirely when CAPTCHA is optional
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('mobile: ignores invalid CAPTCHA token (optional policy)', async () => {
    const result = await contactService.submitContactForm(
      { ...VALID_INPUT, captchaToken: 'definitely-invalid' },
      '127.0.0.1',
      MOBILE_UA
    );

    expect(result).toEqual({ id: 'audit-1' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('security: desktop cannot bypass CAPTCHA via body isMobile flag', async () => {
    await expect(
      contactService.submitContactForm(
        {
          ...VALID_INPUT,
          // @ts-expect-error intentional malicious client field
          isMobile: true,
        },
        '127.0.0.1',
        DESKTOP_UA
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it('security: CAPTCHA secret is never returned in success response', async () => {
    const result = await contactService.submitContactForm(
      { ...VALID_INPUT, captchaToken: 'valid-google-token' },
      '127.0.0.1',
      DESKTOP_UA
    );

    expect(result).toEqual({ id: 'audit-1' });
    expect(JSON.stringify(result)).not.toContain('test-recaptcha-secret');
    expect(JSON.stringify(result)).not.toContain('CONTACT_CAPTCHA');
  });

  it('i18n: CAPTCHA error keys resolve in EN and AR', () => {
    expect(t('contact.captchaRequired', 'en')).toMatch(/robot/i);
    expect(t('contact.captchaFailed', 'en')).toMatch(/CAPTCHA|verification/i);
    expect(t('contact.captchaRequired', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('contact.captchaFailed', 'ar')).toMatch(/[\u0600-\u06FF]/);
  });
});
