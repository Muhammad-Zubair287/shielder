import { DEFAULT_COMPANY_EMAIL } from '../settings.defaults';

describe('DEFAULT_COMPANY_EMAIL backend default', () => {
  it('is the client-provided official contact email', () => {
    expect(DEFAULT_COMPANY_EMAIL).toBe('sales@filter-shielder.com');
  });
});
