/**
 * Security Validation Utility
 * Protects against SQL Injection, Command Injection, XSS, and other injection attacks
 * in sensitive configuration fields.
 * 
 * OWASP Compliance:
 * - Input Validation (OWASP A7 - Broken Access Control)
 * - Injection Prevention (OWASP A03:2021 - Injection)
 */

/**
 * Comprehensive regex patterns for detecting malicious content
 */
const MALICIOUS_PATTERNS = {
  // SQL Injection patterns
  sqlInjection: /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|EXEC|EXECUTE|CREATE|ALTER|TRUNCATE|DECLARE|CAST|CONVERT)\b|['";]|--|\/\*|\*\/|;|OR\s+1\s*=\s*1)/i,
  
  // Command Injection patterns
  commandInjection: /[&|`$(){}[\]<>\\;]/,
  
  // Script/XSS patterns
  scriptInjection: /(<script|javascript:|onerror|onload|on\w+\s*=|<iframe|<embed|<object|<link|<meta|<style|<form)/i,
  
  // NoSQL Injection patterns
  noSqlInjection: /(\$where|\$ne|\$gt|\$lt|\$regex|\$or|\$and)/i,
  
  // Path Traversal patterns
  pathTraversal: /(\.\.|\.\/|\/\.\.|~\/|%2e%2e|%252e%252e)/i,
  
  // LDAP Injection patterns
  ldapInjection: /[*()&|]/,
};

/**
 * Represents validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Security configuration for different field types
 */
interface FieldConfig {
  maxLength: number;
  allowedCharacters?: RegExp;
  disallowedPatterns: RegExp[];
  minLength?: number;
  allowNull?: boolean;
  allowEmpty?: boolean;
}

/**
 * Field configurations for common sensitive fields
 */
const FIELD_CONFIGS: Record<string, FieldConfig> = {
  // Payment Gateway API Keys
  // Most providers use alphanumeric, hyphens, underscores, dots
  paymentGatewayApiKey: {
    maxLength: 500,
    minLength: 8,
    allowedCharacters: /^[a-zA-Z0-9\-_.]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.noSqlInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  // Payment Gateway Secret Keys
  paymentGatewaySecretKey: {
    maxLength: 500,
    minLength: 8,
    allowedCharacters: /^[a-zA-Z0-9\-_.]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.noSqlInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  // Payment Webhook URLs
  paymentWebhookUrl: {
    maxLength: 2048,
    minLength: 10,
    allowedCharacters: /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.pathTraversal,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  // SMTP Configuration
  smtpHost: {
    maxLength: 255,
    minLength: 3,
    allowedCharacters: /^[a-zA-Z0-9\-._]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  smtpUsername: {
    maxLength: 255,
    minLength: 3,
    allowedCharacters: /^[a-zA-Z0-9\-._@]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  smtpPassword: {
    maxLength: 500,
    minLength: 6,
    // Allow broader character set for passwords
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  // Company/Contact Information
  companyName: {
    maxLength: 255,
    minLength: 2,
    // Allow Unicode letters/numbers, spaces, and common punctuation
    allowedCharacters: /^[\p{L}\p{N}\s\-.,&'()]+$/u,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.sqlInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  companyEmail: {
    maxLength: 255,
    minLength: 5,
    allowedCharacters: /^[a-zA-Z0-9._\-@]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  companyPhone: {
    maxLength: 20,
    minLength: 7,
    allowedCharacters: /^[0-9\s\-+()]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  companyAddress: {
    maxLength: 500,
    minLength: 5,
    // Allow Unicode letters/numbers, spaces, and common punctuation
    allowedCharacters: /^[\p{L}\p{N}\s\-.,#&'()]+$/u,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.sqlInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  // API Credentials and Integration Settings
  apiKey: {
    maxLength: 500,
    minLength: 8,
    allowedCharacters: /^[a-zA-Z0-9\-_.]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.noSqlInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  apiSecret: {
    maxLength: 500,
    minLength: 8,
    allowedCharacters: /^[a-zA-Z0-9\-_.]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
      MALICIOUS_PATTERNS.noSqlInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
  
  webhookSecret: {
    maxLength: 500,
    minLength: 8,
    allowedCharacters: /^[a-zA-Z0-9\-_.]+$/,
    disallowedPatterns: [
      MALICIOUS_PATTERNS.sqlInjection,
      MALICIOUS_PATTERNS.commandInjection,
      MALICIOUS_PATTERNS.scriptInjection,
    ],
    allowNull: true,
    allowEmpty: true,
  },
};

/**
 * Trim leading/trailing whitespace from a string
 * @param value - Input string
 * @returns Trimmed string
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value.trim();
}

/**
 * Normalize unknown values into trimmed strings where possible.
 */
export function sanitizeMaybeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === 'string' ? value.trim() : String(value).trim();
}

/**
 * Check if a value contains SQL injection patterns
 * @param value - Value to check
 * @returns true if SQL injection suspected
 */
export function hasSqlInjectionPattern(value: string): boolean {
  if (typeof value !== 'string') return false;
  return MALICIOUS_PATTERNS.sqlInjection.test(value);
}

/**
 * Check if a value contains command injection patterns
 * @param value - Value to check
 * @returns true if command injection suspected
 */
export function hasCommandInjectionPattern(value: string): boolean {
  if (typeof value !== 'string') return false;
  return MALICIOUS_PATTERNS.commandInjection.test(value);
}

/**
 * Check if a value contains script injection patterns
 * @param value - Value to check
 * @returns true if script injection suspected
 */
export function hasScriptInjectionPattern(value: string): boolean {
  if (typeof value !== 'string') return false;
  return MALICIOUS_PATTERNS.scriptInjection.test(value);
}

/**
 * Check if a value contains NoSQL injection patterns
 * @param value - Value to check
 * @returns true if NoSQL injection suspected
 */
export function hasNoSqlInjectionPattern(value: string): boolean {
  if (typeof value !== 'string') return false;
  return MALICIOUS_PATTERNS.noSqlInjection.test(value);
}

/**
 * Map field names to i18n error keys
 */
const FIELD_ERROR_KEY_MAP: Record<string, string> = {
  paymentGatewayApiKey: 'settings.invalidPaymentApiKey',
  paymentGatewaySecretKey: 'settings.invalidPaymentSecretKey',
  paymentWebhookUrl: 'settings.invalidPaymentWebhookUrl',
  smtpHost: 'settings.invalidSmtpHost',
  smtpUsername: 'settings.invalidSmtpUsername',
  smtpPassword: 'settings.invalidSmtpPassword',
  companyName: 'settings.invalidCompanyName',
  companyEmail: 'settings.invalidCompanyEmail',
  companyPhone: 'settings.invalidCompanyPhone',
  companyAddress: 'settings.invalidCompanyAddress',
  apiKey: 'settings.invalidApiKey',
  apiSecret: 'settings.invalidApiSecret',
  webhookSecret: 'settings.invalidWebhookSecret',
};

/**
 * Validate a field against its security configuration
 * Returns i18n error keys instead of raw messages
 * @param fieldName - Name of the field (key in FIELD_CONFIGS)
 * @param value - Value to validate
 * @returns ValidationResult with isValid flag and i18n error keys
 */
export function validateSecurityField(
  fieldName: string,
  value: unknown
): ValidationResult {
  const errors: string[] = [];
  
  // Get field configuration
  const config = FIELD_CONFIGS[fieldName];
  if (!config) {
    // If no specific config exists, apply generic checks
    return validateGenericField(value);
  }
  
  // Check for null/empty
  if (value === null || value === undefined) {
    if (!config.allowNull) {
      errors.push(`validation.required`);
    }
    return { isValid: errors.length === 0, errors };
  }
  
  if (value === '') {
    if (!config.allowEmpty) {
      errors.push(`validation.required`);
    }
    return { isValid: errors.length === 0, errors };
  }
  
  // Convert to string
  const stringValue = String(value).trim();
  
  // Check minimum length
  if (config.minLength && stringValue.length < config.minLength) {
    errors.push(`settings.credentialsTooShort`);
  }
  
  // Check maximum length
  if (config.maxLength && stringValue.length > config.maxLength) {
    errors.push(`settings.credentialsTooLong`);
  }
  
  // Check allowed characters
  if (config.allowedCharacters && !config.allowedCharacters.test(stringValue)) {
    errors.push(FIELD_ERROR_KEY_MAP[fieldName] || 'settings.fieldContainsSpecialChars');
  }
  
  // Check for disallowed patterns (injection attempts)
  for (const pattern of config.disallowedPatterns) {
    if (pattern.test(stringValue)) {
      // Determine the type of injection detected
      if (pattern === MALICIOUS_PATTERNS.sqlInjection) {
        errors.push('settings.sqlInjectionDetected');
      } else if (pattern === MALICIOUS_PATTERNS.scriptInjection) {
        errors.push('settings.scriptInjectionDetected');
      } else {
        errors.push(FIELD_ERROR_KEY_MAP[fieldName] || 'settings.maliciousContentDetected');
      }
      break; // Only report once
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generic field validation (fallback when no specific config)
 * @param value - Value to validate
 * @returns ValidationResult with i18n error keys
 */
function validateGenericField(value: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (value === null || value === undefined || value === '') {
    // Generic fields allow null/empty by default
    return { isValid: true, errors };
  }
  
  const stringValue = String(value).trim();
  
  // Generic max length
  if (stringValue.length > 5000) {
    errors.push('settings.credentialsTooLong');
  }
  
  // Check for obvious injection patterns
  if (hasSqlInjectionPattern(stringValue)) {
    errors.push('settings.sqlInjectionDetected');
  }
  
  if (hasScriptInjectionPattern(stringValue)) {
    errors.push('settings.scriptInjectionDetected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple fields at once
 * @param fields - Object with field name as key and value as value
 * @returns Object with field name and validation results
 */
export function validateSecurityFields(
  fields: Record<string, unknown>
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};
  
  for (const [fieldName, value] of Object.entries(fields)) {
    results[fieldName] = validateSecurityField(fieldName, value);
  }
  
  return results;
}

/**
 * Validate payment gateway settings
 * @param data - Payment settings object
 * @returns ValidationResult with combined errors
 */
export function validatePaymentSettings(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  
  // Validate payment gateway API key
  if (data.paymentGatewayApiKey !== null && data.paymentGatewayApiKey !== '') {
    const apiKeyResult = validateSecurityField('paymentGatewayApiKey', data.paymentGatewayApiKey);
    errors.push(...apiKeyResult.errors);
  }
  
  // Validate payment gateway secret key
  if (data.paymentGatewaySecretKey !== null && data.paymentGatewaySecretKey !== '') {
    const secretKeyResult = validateSecurityField('paymentGatewaySecretKey', data.paymentGatewaySecretKey);
    errors.push(...secretKeyResult.errors);
  }
  
  // Validate webhook URL
  if (data.paymentWebhookUrl !== null && data.paymentWebhookUrl !== '') {
    const webhookResult = validateSecurityField('paymentWebhookUrl', data.paymentWebhookUrl);
    errors.push(...webhookResult.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors: Array.from(new Set(errors)), // Remove duplicates
  };
}

/**
 * Validate general settings (company info)
 * @param data - General settings object
 * @returns ValidationResult
 */
export function validateGeneralSettings(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  
  const fieldsToValidate = [
    'companyName',
    'companyEmail',
    'companyPhone',
    'companyAddress',
    'companyNameEn',
    'companyNameAr',
    'companyLocationEn',
    'companyLocationAr',
  ];
  
  for (const fieldName of fieldsToValidate) {
    if (data[fieldName] !== null && data[fieldName] !== undefined && data[fieldName] !== '') {
      const result = validateSecurityField(fieldName, data[fieldName]);
      errors.push(...result.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: Array.from(new Set(errors)),
  };
}

/**
 * Check if all security fields in the payload are valid
 * Throws an error if any field contains malicious content
 * @param fieldName - Field being validated
 * @param value - Value to validate
 * @throws Error if validation fails
 */
export function enforceSecurityField(fieldName: string, value: unknown): void {
  const result = validateSecurityField(fieldName, value);
  if (!result.isValid) {
    throw new Error(result.errors.join(' '));
  }
}
