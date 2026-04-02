/**
 * Password Utility Functions
 * Validation and strength checking for passwords
 */

/**
 * Password strength requirements
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  HAS_UPPERCASE: /[A-Z]/,
  HAS_LOWERCASE: /[a-z]/,
  HAS_NUMBER: /\d/,
  HAS_SPECIAL: /[!@#$%^&*(),.?":{}|<>]/,
} as const;

/**
 * Password strength meter
 * Returns score (0-4) based on requirements met
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  percentage: number;
} {
  if (!password || password.length === 0) {
    return { score: 0, label: 'Enter a password', color: 'bg-gray-300', percentage: 0 };
  }

  let score = 0;
  const checks = [
    password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
    PASSWORD_REQUIREMENTS.HAS_UPPERCASE.test(password),
    PASSWORD_REQUIREMENTS.HAS_LOWERCASE.test(password),
    PASSWORD_REQUIREMENTS.HAS_NUMBER.test(password),
    PASSWORD_REQUIREMENTS.HAS_SPECIAL.test(password),
  ];

  score = checks.filter(Boolean).length;

  const labels = [
    'Very Weak',
    'Weak',
    'Fair',
    'Good',
    'Strong',
    'Strong',
  ];

  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-green-500',
  ];

  const safeIndex = Math.max(0, Math.min(score, labels.length - 1));

  return {
    score,
    label: labels[safeIndex],
    color: colors[safeIndex],
    percentage: (score / 5) * 100,
  };
}

/**
 * Check if password meets all requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`);
  }

  if (!PASSWORD_REQUIREMENTS.HAS_UPPERCASE.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  if (!PASSWORD_REQUIREMENTS.HAS_LOWERCASE.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  if (!PASSWORD_REQUIREMENTS.HAS_NUMBER.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  if (!PASSWORD_REQUIREMENTS.HAS_SPECIAL.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get password requirement checklist
 */
export function getPasswordRequirements(password: string): Array<{
  label: string;
  met: boolean;
}> {
  return [
    {
      label: `At least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
    },
    {
      label: 'Contains uppercase letter (A-Z)',
      met: PASSWORD_REQUIREMENTS.HAS_UPPERCASE.test(password),
    },
    {
      label: 'Contains lowercase letter (a-z)',
      met: PASSWORD_REQUIREMENTS.HAS_LOWERCASE.test(password),
    },
    {
      label: 'Contains number (0-9)',
      met: PASSWORD_REQUIREMENTS.HAS_NUMBER.test(password),
    },
    {
      label: 'Contains special character',
      met: PASSWORD_REQUIREMENTS.HAS_SPECIAL.test(password),
    },
  ];
}
