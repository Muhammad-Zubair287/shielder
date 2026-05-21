import { validatePassword } from '@/utils/password';

export interface MultiStepRegistrationData {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  location: string;
  companyName: string;
  password: string;
  confirmPassword: string;
}

export type MultiStepRegistrationErrors = Record<string, string>;

export const validateRegistrationStep = (
  currentStep: 1 | 2 | 3,
  formData: MultiStepRegistrationData
): MultiStepRegistrationErrors => {
  const newErrors: MultiStepRegistrationErrors = {};

  if (currentStep === 1) {
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{7,20}$|^(\+?966|0)5[0-9]{8}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
  }

  if (currentStep === 2) {
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
  }

  if (currentStep === 3) {
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
  }

  return newErrors;
};
