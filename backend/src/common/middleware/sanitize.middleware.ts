import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors/api.error';
import { sanitizeObject, sanitizeString } from '@/common/security/sanitizer';

const HTML_TAG_RE = /<[^>]+>/; // detects any HTML tags
const JS_PROTOCOL_RE = /javascript:\s*/i;
const ON_EVENT_ATTR_RE = /on\w+\s*=/i;

function containsMaliciousContent(value: string): boolean {
  if (!value) return false;
  if (HTML_TAG_RE.test(value)) return true;
  if (JS_PROTOCOL_RE.test(value)) return true;
  if (ON_EVENT_ATTR_RE.test(value)) return true;
  return false;
}

function scanObjectForMalicious(obj: any): { found: boolean; example?: string } {
  if (obj === null || obj === undefined) return { found: false };

  if (typeof obj === 'string') {
    if (containsMaliciousContent(obj)) return { found: true, example: obj };
    return { found: false };
  }

  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const r = scanObjectForMalicious(obj[k]);
      if (r.found) return r;
    }
  }

  return { found: false };
}

/**
 * Sanitization middleware
 * - Rejects requests that contain obvious HTML/JS in text inputs
 * - Otherwise sanitizes strings by stripping tags
 */
export const sanitizationMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // Only sanitize request body (we rely on Joi for query/params validation)
  const body = req.body;
  if (!body || typeof body !== 'object') {
    next();
    return;
  }

  const scan = scanObjectForMalicious(body);
  if (scan.found) {
    // Fail fast with 400 — do not create accounts with embedded HTML/JS
    next(new BadRequestError('Invalid input: HTML or script tags detected'));
    return;
  }

  // Safe: Replace req.body with sanitized copy (strips any tags just in case)
  try {
    req.body = sanitizeObject(body);
  } catch (err) {
    // In case of unexpected sanitization failure, fail closed
    next(new BadRequestError('Invalid request body'));
    return;
  }

  next();
};

export default sanitizationMiddleware;
