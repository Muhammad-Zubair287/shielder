import { describe, expect, it } from '@jest/globals';
import { t } from '@/common/i18n';

describe('storage i18n messages', () => {
  it('resolves English storage validation messages', () => {
    expect(t('storage.imageInvalidType', 'en')).toContain('Invalid');
    expect(t('storage.imageTooLarge', 'en')).toContain('large');
    expect(t('storage.privateInvalidToken', 'en')).toContain('token');
    expect(t('storage.attachmentTooLarge', 'en')).toContain('large');
    expect(t('profile.imageDataUriRejected', 'en')).toContain('URL/path');
  });

  it('resolves Arabic storage validation messages', () => {
    expect(t('storage.imageInvalidType', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('storage.imageTooLarge', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('storage.privateInvalidToken', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('storage.attachmentInvalidType', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('profile.noFieldsToUpdate', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('contact.captchaRequired', 'ar')).toMatch(/[\u0600-\u06FF]/);
  });
});
