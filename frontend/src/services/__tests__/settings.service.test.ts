import {
  getCompanyEmailFromPublicSettings,
  getCompanyPhoneFromPublicSettings,
  buildCompanyMailtoHref,
  buildCompanyTelHref,
} from '@/services/settings.service';

describe('getCompanyEmailFromPublicSettings', () => {
  it('returns snake_case company_email from public API payload', () => {
    expect(
      getCompanyEmailFromPublicSettings({ company_email: 'sales@filter-shielder.com' }),
    ).toBe('sales@filter-shielder.com');
  });

  it('falls back to camelCase companyEmail when present', () => {
    expect(
      getCompanyEmailFromPublicSettings({ companyEmail: 'support@filter-shielder.com' }),
    ).toBe('support@filter-shielder.com');
  });

  it('prefers snake_case when both are present', () => {
    expect(
      getCompanyEmailFromPublicSettings({
        company_email: 'primary@filter-shielder.com',
        companyEmail: 'secondary@filter-shielder.com',
      }),
    ).toBe('primary@filter-shielder.com');
  });

  it('returns empty string when settings are null or email is missing', () => {
    expect(getCompanyEmailFromPublicSettings(null)).toBe('');
    expect(getCompanyEmailFromPublicSettings({})).toBe('');
    expect(getCompanyEmailFromPublicSettings({ company_email: '  ' })).toBe('');
  });
});

describe('getCompanyPhoneFromPublicSettings', () => {
  it('returns snake_case company_phone from public API payload', () => {
    expect(
      getCompanyPhoneFromPublicSettings({ company_phone: '+966 55 987 6543' }),
    ).toBe('+966 55 987 6543');
  });

  it('falls back to camelCase companyPhone when present', () => {
    expect(
      getCompanyPhoneFromPublicSettings({ companyPhone: '+966501234567' }),
    ).toBe('+966501234567');
  });

  it('returns empty string when settings are null or phone is missing', () => {
    expect(getCompanyPhoneFromPublicSettings(null)).toBe('');
    expect(getCompanyPhoneFromPublicSettings({})).toBe('');
  });
});

describe('buildCompanyMailtoHref', () => {
  it('builds mailto link from configured email', () => {
    expect(buildCompanyMailtoHref('sales@filter-shielder.com')).toBe(
      'mailto:sales@filter-shielder.com',
    );
  });

  it('returns null when email is empty', () => {
    expect(buildCompanyMailtoHref('')).toBeNull();
    expect(buildCompanyMailtoHref('   ')).toBeNull();
  });
});

describe('buildCompanyTelHref', () => {
  it('builds tel link from configured phone with formatting stripped', () => {
    expect(buildCompanyTelHref('+966 50 681 4416')).toBe('tel:+966506814416');
  });

  it('returns null when phone is empty', () => {
    expect(buildCompanyTelHref('')).toBeNull();
    expect(buildCompanyTelHref('   ')).toBeNull();
  });
});
