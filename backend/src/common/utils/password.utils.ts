/**
 * Password Utilities
 * Centralized password hashing and validation
 * 
 * ⚠️ CRITICAL SECURITY RULE:
 * ALL password operations MUST use these utilities to ensure proper bcrypt hashing.
 * NEVER store plain text passwords or update passwordHash directly without bcrypt.
 */

import bcrypt from 'bcryptjs';

const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  'password',
  'password1',
  'password123',
  'password123!',
  'admin123',
  'admin123!',
  'welcome',
  'welcome1!',
  'qwerty',
  'qwerty123',
  'letmein',
  'iloveyou',
  'p@ssw0rd!',
]);

export type PasswordStrengthOptions = {
  minLength?: number;
  requireComplexity?: boolean;
};

export function normalizePasswordCandidate(password: string): string {
  return password.trim().toLowerCase();
}

export function isCommonWeakPassword(password: string): boolean {
  return COMMON_WEAK_PASSWORDS.has(normalizePasswordCandidate(password));
}

/**
 * Standard bcrypt salt rounds
 * Matches AuthService.SALT_ROUNDS (12 rounds = ~200ms on modern hardware)
 */
export const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * 
 * @param plainPassword - The plain text password to hash
 * @returns Promise<string> - The bcrypt hashed password
 * 
 * @example
 * const hashedPassword = await hashPassword('MySecurePass123!');
 * await prisma.user.update({ data: { passwordHash: hashedPassword } });
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash
 * 
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 * 
 * @example
 * const isValid = await verifyPassword(userInput, user.passwordHash);
 * if (!isValid) throw new UnauthorizedError('Invalid credentials');
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Validate password strength
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - The password to validate
 * @throws Error if password doesn't meet requirements
 */
export function validatePasswordStrength(
  password: string,
  options: PasswordStrengthOptions = {}
): void {
  const minLength = options.minLength ?? 8;
  const requireComplexity = options.requireComplexity ?? true;

  if (typeof password !== 'string' || password.trim().length === 0) {
    throw new Error('Password is required');
  }

  if (password.length > 128) {
    throw new Error('Password must not exceed 128 characters');
  }

  if (password.length < minLength) {
    throw new Error(`Password must be at least ${minLength} characters long`);
  }

  if (isCommonWeakPassword(password)) {
    throw new Error('Password does not meet security requirements');
  }

  if (!requireComplexity) {
    return;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  if (!hasLowerCase) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  if (!hasNumber) {
    throw new Error('Password must contain at least one number');
  }

  if (!hasSpecialChar) {
    throw new Error('Password must contain at least one special character');
  }
}

/**
 * Generate a random secure password
 * Useful for password resets or temporary passwords
 * 
 * @param length - Length of password (default: 16)
 * @returns A random password meeting all strength requirements
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
