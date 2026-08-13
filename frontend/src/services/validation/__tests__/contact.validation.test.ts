import { validateContactForm } from '../contact.validation';
import { ContactFormValues } from '@/app/contact/contact.types';
import { isPhoneUserAgent } from '@/utils/device';

const baseValues: ContactFormValues = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '+966501234567',
  subject: 'General Inquiry',
  message: 'Hello from the contact form.',
  captchaConfirmed: false,
};

describe('isPhoneUserAgent (contact CAPTCHA UX)', () => {
  it('matches backend phone UA detection', () => {
    expect(
      isPhoneUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      )
    ).toBe(true);
    expect(
      isPhoneUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });
});

describe('validateContactForm CAPTCHA rules', () => {
  it('desktop: requires captchaConfirmed', () => {
    const errors = validateContactForm(baseValues, null, undefined, { requireCaptcha: true });
    expect(errors.some((e) => e.field === 'captchaConfirmed')).toBe(true);
  });

  it('desktop: passes when captchaConfirmed is true', () => {
    const errors = validateContactForm(
      { ...baseValues, captchaConfirmed: true },
      null,
      undefined,
      { requireCaptcha: true }
    );
    expect(errors).toEqual([]);
  });

  it('mobile: allows submission without captchaConfirmed', () => {
    const errors = validateContactForm(baseValues, null, undefined, { requireCaptcha: false });
    expect(errors.some((e) => e.field === 'captchaConfirmed')).toBe(false);
    expect(errors).toEqual([]);
  });

  it('defaults to requiring CAPTCHA when options omitted', () => {
    const errors = validateContactForm(baseValues, null);
    expect(errors.some((e) => e.field === 'captchaConfirmed')).toBe(true);
  });
});
