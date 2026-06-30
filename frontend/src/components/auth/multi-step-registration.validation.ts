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
  formData: MultiStepRegistrationData,
  t: (key: string) => string = (key: string) => key
): MultiStepRegistrationErrors => {
  const newErrors: MultiStepRegistrationErrors = {};

  if (currentStep === 1) {
    if (!formData.fullName.trim()) {
      newErrors.fullName = t('nameRequired');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('invalidEmail');
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('phoneRequired');
    } else if (!/^\+?[\d\s\-\(\)]{7,20}$|^(\+?966|0)5[0-9]{8}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('invalidPhone');
    }
    if (!formData.address.trim()) {
      newErrors.address = t('addressRequired');
    }
    if (!formData.location.trim()) {
      newErrors.location = t('locationRequired');
    }
  }

  if (currentStep === 2) {
    if (!formData.companyName.trim()) {
      newErrors.companyName = t('companyRequired');
    }
  }

  if (currentStep === 3) {
    if (!formData.password) {
      newErrors.password = t('passwordRequired');
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordMismatch');
    }
  }

  return newErrors;
};
