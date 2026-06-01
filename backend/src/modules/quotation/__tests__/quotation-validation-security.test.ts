import { describe, it, expect } from '@jest/globals';
import { quotationValidation } from '../quotation.validation';

describe('Quotation customerName security validation', () => {
  it('rejects script-tag payloads', () => {
    const { error } = quotationValidation.create.validate({
      customerName: '<script>alert(1)</script>',
      customerEmail: 'security-test@example.com',
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
      expiryDate: '2026-12-31T00:00:00.000Z',
    });

    expect(error).toBeDefined();
    expect(error?.message.toLowerCase()).toContain('invalid');
  });

  it('rejects sql-like quote payloads', () => {
    const { error } = quotationValidation.create.validate({
      customerName: "' OR '1'='1",
      customerEmail: 'security-test@example.com',
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
      expiryDate: '2026-12-31T00:00:00.000Z',
    });

    expect(error).toBeDefined();
    expect(error?.message.toLowerCase()).toContain('invalid');
  });
});