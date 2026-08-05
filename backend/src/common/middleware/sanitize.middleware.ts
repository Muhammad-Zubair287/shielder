import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors/api.error';
import { sanitizeObject, sanitizeHtmlAllowlist } from '@/common/security/sanitizer';
import { t } from '@/common/i18n';

const HTML_TAG_RE = /<[^>]+>/; // detects any HTML tags
const JS_PROTOCOL_RE = /javascript:\s*/i;
const ON_EVENT_ATTR_RE = /on\w+\s*=/i;
// These patterns are never valid in a plain user-editable text value. Database
// queries use Prisma parameters, but rejecting them at the boundary prevents
// malicious payloads being persisted, reflected, or forwarded to integrations.
const SQL_INJECTION_RE = /(?:['"]\s*(?:or|and)\s*['"]?\s*(?:\d+|true)|\bunion\s+select\b|\bdrop\s+table\b|\binsert\s+into\b|\bdelete\s+from\b|\bupdate\s+\w+\s+set\b|--|\/\*|\*\/|;)/i;
const CONTROL_CHARACTER_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// Secrets and opaque cryptographic values are not rendered or queried as text.
// Applying SQL heuristics to them would reject legitimate password/key values.
const OPAQUE_FIELD_RE = /(?:password|token|secret|signature|api[_-]?key|authorization|captcha)/i;
const RICH_TEXT_FIELDS = new Set(['contentEn', 'contentAr']);

function containsMaliciousContent(value: string, key?: string): boolean {
  if (!value) return false;
  if (HTML_TAG_RE.test(value)) return true;
  if (JS_PROTOCOL_RE.test(value)) return true;
  if (ON_EVENT_ATTR_RE.test(value)) return true;
  if (CONTROL_CHARACTER_RE.test(value)) return true;
  if (!key || !OPAQUE_FIELD_RE.test(key)) {
    if (SQL_INJECTION_RE.test(value)) return true;
  }
  return false;
}

function scanObjectForMalicious(obj: any, key?: string): { found: boolean; example?: string } {
  if (obj === null || obj === undefined) return { found: false };

  if (typeof obj === 'string') {
    if (containsMaliciousContent(obj, key)) return { found: true, example: obj };
    return { found: false };
  }

  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      // Rich CMS fields are sanitized with an explicit allowlist below.
      if (RICH_TEXT_FIELDS.has(k)) continue;
      const r = scanObjectForMalicious(obj[k], k);
      if (r.found) return r;
    }
  }

  return { found: false };
}

/**
 * Sanitization middleware
 * - Rejects HTML/JS, SQL-injection syntax, and control characters in plain text
 * - Allows safe HTML for CMS/policy fields
 * - Authorization is enforced at route level (authenticate + role middleware)
 * - Otherwise sanitizes strings by stripping tags
 */
export const sanitizationMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body;
  const queryScan = scanObjectForMalicious(req.query);
  if (queryScan.found) {
    next(new BadRequestError(t('validation.invalidFormat', req.locale ?? 'en')));
    return;
  }

  if (!body || typeof body !== 'object') return next();

  // Special-case: allow safe HTML for CMS-like fields (privacy policy / terms)
  // Authorization is handled by route middleware; this layer only sanitizes content.
  if ('contentEn' in body || 'contentAr' in body) {
    // Apply allowlist sanitizer to policy content fields
    try {
      if (typeof body.contentEn === 'string') {
        body.contentEn = sanitizeHtmlAllowlist(body.contentEn);
      }
      if (typeof body.contentAr === 'string') {
        body.contentAr = sanitizeHtmlAllowlist(body.contentAr);
      }
      const scan = scanObjectForMalicious(body);
      if (scan.found) {
        next(new BadRequestError(t('validation.invalidFormat', req.locale ?? 'en')));
        return;
      }
      req.body = body;
      next();
      return;
    } catch (err) {
      next(new BadRequestError(t('validation.invalidFormat', req.locale ?? 'en')));
      return;
    }
  }

  const scan = scanObjectForMalicious(body);
  if (scan.found) {
    // Fail fast with 400 — do not create accounts with embedded HTML/JS
    next(new BadRequestError(t('validation.invalidFormat', req.locale ?? 'en')));
    return;
  }

  // Safe: Replace req.body with sanitized copy (strips any tags just in case)
  try {
    req.body = sanitizeObject(body);
  } catch (err) {
    // In case of unexpected sanitization failure, fail closed
    next(new BadRequestError(t('validation.invalidFormat', req.locale ?? 'en')));
    return;
  }

  next();
};


export default sanitizationMiddleware;
