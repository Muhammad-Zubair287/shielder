import { VALIDATION_MESSAGES } from '@/constants/ui.constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateForgotPasswordEmail = (email: string): string | null => {
  if (!email.trim()) return VALIDATION_MESSAGES.REQUIRED_FIELD;
  if (!EMAIL_REGEX.test(email)) return VALIDATION_MESSAGES.INVALID_EMAIL;
  return null;
};

export const validateResetPassword = (
  password: string,
  confirmPassword: string
): string | null => {
  if (!password || !confirmPassword) return VALIDATION_MESSAGES.REQUIRED_FIELD;
  if (password.length < 8) return VALIDATION_MESSAGES.PASSWORD_TOO_SHORT;
  if (password !== confirmPassword) return VALIDATION_MESSAGES.PASSWORDS_DO_NOT_MATCH;
  return null;
};
