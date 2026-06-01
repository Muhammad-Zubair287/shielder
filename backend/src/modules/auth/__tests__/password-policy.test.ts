import { describe, expect, it } from '@jest/globals';
import { authValidation } from '../auth.validation';

const validAuthPayload = {
  email: 'customer@example.com',
  fullName: 'Valid Customer',
  phoneNumber: '+966501234567',
  address: 'Riyadh',
  companyName: 'Shielder',
  role: 'USER',
};

describe('Auth password policy', () => {
  it('rejects weak registration passwords', () => {
    const result = authValidation.register.validate({
      ...validAuthPayload,
      password: 'Password123!',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details.map((detail) => detail.path.join('.'))).toContain('password');
  });

  it('rejects whitespace-only reset passwords', () => {
    const result = authValidation.resetPassword.validate({
      token: 'reset-token',
      newPassword: '   ',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details.map((detail) => detail.path.join('.'))).toContain('newPassword');
  });

  it('rejects common weak change-password values', () => {
    const result = authValidation.changePassword.validate({
      oldPassword: 'CurrentPass123!',
      newPassword: 'Password123!',
    });

    expect(result.error).toBeDefined();
    expect(result.error?.details.map((detail) => detail.path.join('.'))).toContain('newPassword');
  });

  it('accepts a strong password across auth flows', () => {
    const registerResult = authValidation.register.validate({
      ...validAuthPayload,
      password: 'ValidPass123!',
    });

    const resetResult = authValidation.resetPassword.validate({
      token: 'reset-token',
      newPassword: 'ValidPass123!',
    });

    const changeResult = authValidation.changePassword.validate({
      oldPassword: 'CurrentPass123!',
      newPassword: 'ValidPass123!',
    });

    expect(registerResult.error).toBeUndefined();
    expect(resetResult.error).toBeUndefined();
    expect(changeResult.error).toBeUndefined();
  });
});