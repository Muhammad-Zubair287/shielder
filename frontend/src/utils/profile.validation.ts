/**
 * Profile Validation Schemas
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized validation schemas and utilities for profile-related forms.
 * This module provides reusable validation logic following DRY principles
 * to ensure consistency across all profile forms and endpoints.
 * 
 * @module profile.validation
 */

/**
 * Profile form validation result
 * @interface ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {Record<string, string>} errors - Field errors (empty if valid)
 */
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Profile update data validation
 * Validates the complete profile information form
 * 
 * @param {Object} data - Form data to validate
 * @param {string} data.fullName - User's full name
 * @param {string} data.email - User's email address
 * @param {string} [data.phone] - User's phone (optional)
 * @param {string} [data.location] - User's location (optional)
 * @param {string} [data.address] - User's address (optional)
 * @returns {ValidationResult} Validation result with errors
 * 
 * @example
 * const result = validateProfileUpdate(formData);
 * if (!result.isValid) {
 *   console.log(result.errors); // { email: 'Invalid email' }
 * }
 */
export function validateProfileUpdate(data: {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Full name validation
  if (!data.fullName?.trim()) {
    errors.fullName = 'nameRequired';
  }

  // Email validation
  if (!data.email?.trim()) {
    errors.email = 'emailRequired';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'invalidEmail';
  }

  // Phone validation (optional but must be valid length if provided)
  if (data.phone && data.phone.trim().length < 7) {
    errors.phone = 'profile.phoneMinLength';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Password change validation
 * Validates password change form data including strength and confirmation
 * 
 * @param {Object} data - Password data to validate
 * @param {string} data.currentPassword - Current password
 * @param {string} data.newPassword - New password
 * @param {string} data.confirmNewPassword - Password confirmation
 * @returns {ValidationResult} Validation result with errors
 * 
 * @example
 * const result = validatePasswordChange(formData);
 * if (!result.isValid) {
 *   console.log(result.errors);
 * }
 */
export function validatePasswordChange(data: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Current password validation
  if (!data.currentPassword) {
    errors.currentPassword = 'passwordRequired';
  }

  // New password validation
  if (!data.newPassword) {
    errors.newPassword = 'passwordRequired';
  } else if (data.newPassword.length < 8) {
    errors.newPassword = 'passwordMinLength';
  }

  // Confirmation password validation
  if (!data.confirmNewPassword) {
    errors.confirmNewPassword = 'passwordRequired';
  } else if (data.newPassword !== data.confirmNewPassword) {
    errors.confirmNewPassword = 'profile.passwordMismatch';
  }

  // Password reuse check
  if (data.currentPassword && data.currentPassword === data.newPassword) {
    errors.newPassword = 'profile.passwordDifferent';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Profile image validation
 * Validates uploaded image file before processing
 * 
 * @param {File} file - File to validate
 * @returns {ValidationResult} Validation result with errors
 * 
 * @example
 * const file = e.target.files[0];
 * const result = validateProfileImage(file);
 * if (!result.isValid) {
 *   showError(result.errors.file);
 * }
 */
export function validateProfileImage(file: File): ValidationResult {
  const errors: Record<string, string> = {};

  // File size validation (max 2MB)
  const maxSizeMB = 2;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.file = 'profile.fileTooLarge';
  }

  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.file = 'profile.invalidFileType';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Email validation utility
 * Performs basic email format validation
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 * 
 * @example
 * if (isValidEmail(userEmail)) {
 *   // Valid email
 * }
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone number validation utility
 * Checks minimum length requirement for phone numbers
 * 
 * @param {string} phone - Phone number to validate
 * @param {number} [minLength=7] - Minimum required length
 * @returns {boolean} True if phone meets length requirement
 * 
 * @example
 * if (isValidPhone(userPhone)) {
 *   // Valid phone number
 * }
 */
export function isValidPhone(phone: string, minLength: number = 7): boolean {
  return phone.trim().length >= minLength;
}

/**
 * Sanitize user input to prevent injection attacks
 * Basic sanitization for common XSS vectors
 * 
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 * 
 * @example
 * const safeInput = sanitizeInput(userInput);
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/[<>\"']/g, '')
    .substring(0, 255); // Prevent extremely long strings
}
