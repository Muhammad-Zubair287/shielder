import {
  type MultiStepRegistrationData,
  validateRegistrationStep,
} from '../multi-step-registration.validation';

const validForm: MultiStepRegistrationData = {
  fullName: 'Valid Customer',
  email: 'customer@example.com',
  phoneNumber: '+966501234567',
  address: '',
  location: '',
  companyName: '',
  password: 'ValidPass123!',
  confirmPassword: 'ValidPass123!',
};

describe('multi-step registration optional fields', () => {
  it('allows address, location, and company name to be empty', () => {
    expect(validateRegistrationStep(1, validForm)).toEqual({});
    expect(validateRegistrationStep(2, validForm)).toEqual({});
  });

  it('continues to reject unsafe values when an optional field is supplied', () => {
    expect(validateRegistrationStep(1, {
      ...validForm,
      location: '<script>alert(1)</script>',
    })).toHaveProperty('location');
    expect(validateRegistrationStep(2, {
      ...validForm,
      companyName: 'x'.repeat(51),
    })).toHaveProperty('companyName');
  });
});
