import { describe, expect, it } from '@jest/globals';
import { adminValidation } from '../admin.validation';

describe('Admin password policy', () => {
  it('rejects weak create-user passwords', () => {
    const result = adminValidation.createUser.validate({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details.map((detail) => detail.path.join('.'))).toContain('password');
  });

  it('rejects whitespace-only reset passwords', () => {
    const result = adminValidation.resetPassword.validate({
      password: '   ',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details.map((detail) => detail.path.join('.'))).toContain('password');
  });

  it('accepts a strong password for admin operations', () => {
    const createResult = adminValidation.createUser.validate({
      email: 'user@example.com',
      password: 'ValidPass123!',
    });

    const resetResult = adminValidation.resetPassword.validate({
      password: 'ValidPass123!',
    });

    expect(createResult.error).toBeUndefined();
    expect(resetResult.error).toBeUndefined();
  });
});