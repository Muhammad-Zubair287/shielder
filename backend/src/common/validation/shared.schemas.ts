import Joi from 'joi';

export const sharedValidationSchemas = {
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),

  uuid: Joi.string().uuid().required(),

  // Generic text field without HTML/JS content
  textNoHtml: Joi.string()
    .trim()
    .max(1024)
    .custom((value, helpers) => {
      if (/<[^>]+>/.test(value)) return helpers.error('string.invalid', { message: 'HTML tags are not allowed' });
      if (/javascript:\s*/i.test(value)) return helpers.error('string.invalid', { message: 'JavaScript URIs are not allowed' });
      if (/on\w+\s*=/.test(value)) return helpers.error('string.invalid', { message: 'Event handlers are not allowed' });
      return value;
    }, 'No HTML/JS')
    .messages({
      'string.invalid': 'Input contains disallowed HTML or script content',
    }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
