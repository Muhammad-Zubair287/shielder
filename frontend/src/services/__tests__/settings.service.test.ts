import { getCompanyEmailFromPublicSettings, buildCompanyMailtoHref } from '@/services/settings.service';

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
