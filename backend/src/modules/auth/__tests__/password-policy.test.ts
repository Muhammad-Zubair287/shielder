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
  it('accepts omitted and empty optional signup text while retaining validation for provided values', () => {
    const base = {
      email: 'optional-fields@example.com',
      fullName: 'Valid Customer',
      phoneNumber: '+966501234567',
      password: 'ValidPass123!',
    };

    for (const schema of [authValidation.register, authValidation.initiateRegistration]) {
      const omitted = schema.validate(base);
      const empty = schema.validate({
        ...base,
        address: '   ',
        location: '',
        companyName: '',
      });
      const addressOnly = schema.validate({ ...base, address: 'Riyadh' });
      const locationOnly = schema.validate({ ...base, location: 'Saudi Arabia' });
      const companyOnly = schema.validate({ ...base, companyName: 'Shielder' });
      const allProvided = schema.validate({
        ...base,
        address: 'Riyadh',
        location: 'Saudi Arabia',
        companyName: 'Shielder',
      });
      const unsafe = schema.validate({ ...base, companyName: '<script>alert(1)</script>' });

      expect(omitted.error).toBeUndefined();
      expect(empty.error).toBeUndefined();
      expect(addressOnly.error).toBeUndefined();
      expect(locationOnly.error).toBeUndefined();
      expect(companyOnly.error).toBeUndefined();
      expect(allProvided.error).toBeUndefined();
      expect(empty.value.address).toBeUndefined();
      expect(empty.value.location).toBeUndefined();
      expect(empty.value.companyName).toBeUndefined();
      expect(unsafe.error?.details.map((detail) => detail.path.join('.'))).toContain('companyName');
    }
  });

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
