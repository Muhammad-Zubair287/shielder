/**
 * Form Validation Service
 * Centralized validation logic for all forms
 * Extracted from components to ensure DRY and proper separation of concerns
 */

import { VALIDATION_MESSAGES, AUTH_FORM, CONTACT_FORM } from '@/constants/ui.constants';

export interface ValidationError {
  field: string;
  message: string;
}

export interface RegistrationStepData {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  companyName: string;
  password: string;
  confirmPassword: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationError | null => {
  if (!email) {
    return { field: 'email', message: VALIDATION_MESSAGES.REQUIRED_FIELD };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: 'email', message: VALIDATION_MESSAGES.INVALID_EMAIL };
  }

  return null;
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationError | null => {
  if (!password) {
    return { field: 'password', message: VALIDATION_MESSAGES.REQUIRED_FIELD };
  }

  if (password.length < AUTH_FORM.PASSWORD_MIN_LENGTH) {
    return {
      field: 'password',
      message: VALIDATION_MESSAGES.PASSWORD_TOO_SHORT,
    };
  }

  return null;
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationError | null => {
  if (!confirmPassword) {
    return { field: 'confirmPassword', message: VALIDATION_MESSAGES.REQUIRED_FIELD };
  }

  if (password !== confirmPassword) {
    return {
      field: 'confirmPassword',
      message: VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH,
    };
  }

  return null;
};

/**
 * Phone number validation
 */
export const validatePhoneNumber = (phone: string, required: boolean = true): ValidationError | null => {
  if (!phone && required) {
    return { field: 'phone', message: VALIDATION_MESSAGES.REQUIRED_FIELD };
  }

  if (phone && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(phone)) {
    return { field: 'phone', message: VALIDATION_MESSAGES.INVALID_PHONE };
  }

  return null;
};

/**
 * Required field validation
 */
export const validateRequired = (value: string, fieldName: string): ValidationError | null => {
  if (!value || value.trim() === '') {
    return { field: fieldName, message: VALIDATION_MESSAGES.REQUIRED_FIELD };
  }

  return null;
};

/**
 * Min length validation
 */
export const validateMinLength = (value: string, min: number, fieldName: string): ValidationError | null => {
  if (value && value.length < min) {
    return {
      field: fieldName,
      message: VALIDATION_MESSAGES.FIELD_TOO_SHORT(min),
    };
  }

  return null;
};

/**
 * Max length validation
 */
export const validateMaxLength = (value: string, max: number, fieldName: string): ValidationError | null => {
  if (value && value.length > max) {
    return {
      field: fieldName,
      message: VALIDATION_MESSAGES.FIELD_TOO_LONG(max),
    };
  }

  return null;
};

/**
 * File size validation (in MB)
 */
export const validateFileSize = (file: File, maxSizeMB: number): ValidationError | null => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      field: 'file',
      message: VALIDATION_MESSAGES.FILE_TOO_LARGE,
    };
  }

  return null;
};

/**
 * File type validation
 */
export const validateFileType = (file: File, allowedTypes: string[]): ValidationError | null => {
  if (!allowedTypes.includes(file.type)) {
    return { field: 'file', message: VALIDATION_MESSAGES.INVALID_FILE_TYPE };
  }

  return null;
};

/**
 * Contact form validation
 */
export const validateContactForm = (formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Name validation
  const nameError = validateRequired(formData.name, 'name');
  if (nameError) errors.push(nameError);

  // Email validation
  const emailError = validateEmail(formData.email);
  if (emailError) errors.push(emailError);

  // Subject validation
  const subjectError = validateRequired(formData.subject, 'subject');
  if (subjectError) errors.push(subjectError);

  // Message validation
  const messageError = validateRequired(formData.message, 'message');
  if (messageError) errors.push(messageError);

  const messageLengthError = validateMaxLength(
    formData.message,
    CONTACT_FORM.MESSAGE_MAX_LENGTH,
    'message'
  );
  if (messageLengthError) errors.push(messageLengthError);

  // Phone validation (optional)
  if (formData.phone) {
    const phoneError = validatePhoneNumber(formData.phone, false);
    if (phoneError) errors.push(phoneError);
  }

  return errors;
};

/**
 * Login form validation
 */
export const validateLoginForm = (formData: { email: string; password: string }): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(formData.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push(passwordError);

  return errors;
};

/**
 * Signup form validation
 */
export const validateSignupForm = (formData: {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(formData.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push(passwordError);

  const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmError) errors.push(confirmError);

  const nameError = validateRequired(formData.fullName, 'fullName');
  if (nameError) errors.push(nameError);

  return errors;
};

/**
 * Multi-step registration validation
 */
export const validateRegistrationStep = (
  formData: RegistrationStepData,
  currentStep: 1 | 2 | 3
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (currentStep === 1) {
    const fullNameError = validateRequired(formData.fullName, 'fullName');
    if (fullNameError) errors.push(fullNameError);

    const emailError = validateEmail(formData.email);
    if (emailError) errors.push(emailError);

    if (!formData.phoneNumber.trim()) {
      errors.push({ field: 'phoneNumber', message: 'Phone number is required' });
    } else if (!/^\+?[\d\s\-\(\)]{7,20}$|^(\+?966|0)5[0-9]{8}$/.test(formData.phoneNumber)) {
      errors.push({ field: 'phoneNumber', message: 'Please enter a valid phone number' });
    }

    const addressError = validateRequired(formData.address, 'address');
    if (addressError) errors.push(addressError);
  }

  if (currentStep === 2) {
    const companyNameError = validateRequired(formData.companyName, 'companyName');
    if (companyNameError) errors.push(companyNameError);
  }

  if (currentStep === 3) {
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      errors.push(passwordError);
    } else {
      const strength = calculatePasswordStrength(formData.password);
      if (strength < 3) {
        errors.push({ field: 'password', message: 'Password is too weak. Use a stronger password.' });
      }
    }

    const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmError) errors.push(confirmError);
  }

  return errors;
};

/**
 * Reset password form validation
 */
export const validateResetPasswordForm = (formData: {
  password: string;
  confirmPassword: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push(passwordError);

  const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmError) errors.push(confirmError);

  return errors;
};

/**
 * Calculate password strength
 * Returns 0-4 where 4 is strongest
 */
export const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(password)) strength++;

  return Math.min(strength, 4);
};

/**
 * Get password strength label
 */
export const getPasswordStrengthLabel = (strength: number): string => {
  const labels = ['Weak', 'Fair', 'Good', 'Good', 'Strong'];
  return labels[strength] || 'Weak';
};

/**
 * Get password strength color (for UI)
 */
export const getPasswordStrengthColor = (strength: number): string => {
  const colors = ['text-red-500', 'text-yellow-500', 'text-blue-500', 'text-blue-500', 'text-green-500'];
  return colors[strength] || colors[0];
};
