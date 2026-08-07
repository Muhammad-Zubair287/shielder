import { validatePassword } from '@/utils/password';
import { PHONE_REGEX } from '@/utils/phoneUtils';

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

export const REGISTRATION_TEXT_LIMITS = {
  fullName: 50,
  email: 254,
  phoneNumber: 20,
  address: 150,
  location: 150,
  companyName: 50,
  password: 32,
} as const;

type TextField = 'fullName' | 'address' | 'location' | 'companyName';

const hasUnsafeText = (value: string): boolean =>
  /[\u0000-\u001F\u007F]/.test(value) ||
  /<[^>]*>|javascript\s*:|on\w+\s*=/i.test(value) ||
  /(?:'|")\s*(?:or|and)\s*(?:'|")?\s*(?:\d+|true)/i.test(value) ||
  /\b(?:union\s+select|drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b|--|\/\*|\*\/|;/i.test(value);

const validateTextField = (
  field: TextField,
  value: string,
  t: (key: string) => string,
): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return field === 'fullName' ? t('nameRequired') : undefined;
  }
  if (value.length > REGISTRATION_TEXT_LIMITS[field]) return t('validation.maxLength');
  if (hasUnsafeText(value)) return t('validation.invalidText');

  if (field === 'fullName' && !/^(?=.*[\p{L}])[\p{L}\s'’-]+$/u.test(trimmed)) {
    return t('validation.fullNameInvalid');
  }

  return undefined;
};

/** Validate one registration field for instant, non-authoritative UX feedback. */
export const validateRegistrationField = (
  field: keyof MultiStepRegistrationData,
  value: string,
  formData: MultiStepRegistrationData,
  t: (key: string) => string = (key) => key,
): string | undefined => {
  if (field === 'fullName' || field === 'address' || field === 'location' || field === 'companyName') {
    return validateTextField(field as TextField, value, t);
  }

  if (field === 'email') {
    if (!value.trim()) return t('emailRequired');
    if (hasUnsafeText(value)) return t('validation.invalidText');
    if (value.length > REGISTRATION_TEXT_LIMITS.email) return t('validation.maxLength');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('invalidEmail');
  }

  if (field === 'phoneNumber') {
    if (!value.trim()) return t('phoneRequired');
    if (hasUnsafeText(value)) return t('validation.invalidText');
    if (value.length > REGISTRATION_TEXT_LIMITS.phoneNumber) return t('validation.maxLength');
    if (!PHONE_REGEX.test(value.trim()) || !/[0-9]/.test(value)) return t('invalidPhone');
  }

  if (field === 'password') {
    if (!value) return t('passwordRequired');
    if (hasUnsafeText(value)) return t('validation.invalidText');
    if (value.length > REGISTRATION_TEXT_LIMITS.password) return t('validation.maxLength');
    const passwordValidation = validatePassword(value);
    if (!passwordValidation.isValid) return passwordValidation.errors[0];
  }
  if (field === 'confirmPassword') {
    if (!value) return t('confirmPasswordRequired');
    if (hasUnsafeText(value)) return t('validation.invalidText');
    if (value !== formData.password) return t('passwordMismatch');
  }

  return undefined;
};

export const validateRegistrationStep = (
  currentStep: 1 | 2 | 3,
  formData: MultiStepRegistrationData,
  t: (key: string) => string = (key: string) => key
): MultiStepRegistrationErrors => {
  const newErrors: MultiStepRegistrationErrors = {};

  if (currentStep === 1) {
    (['fullName', 'email', 'phoneNumber', 'address', 'location'] as const).forEach((field) => {
      const error = validateRegistrationField(field, formData[field], formData, t);
      if (error) newErrors[field] = error;
    });
  }

  if (currentStep === 2) {
    const error = validateRegistrationField('companyName', formData.companyName, formData, t);
    if (error) newErrors.companyName = error;
  }

  if (currentStep === 3) {
    const passwordError = validateRegistrationField('password', formData.password, formData, t);
    if (passwordError) newErrors.password = passwordError;
    const confirmationError = validateRegistrationField('confirmPassword', formData.confirmPassword, formData, t);
    if (confirmationError) newErrors.confirmPassword = confirmationError;
  }

  return newErrors;
};
