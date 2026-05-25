import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize a single string by stripping all HTML tags and dangerous attributes.
 * Keeps plain text only. Also trims whitespace.
 */
export function sanitizeString(input: string | undefined | null): string {
  if (input === undefined || input === null) return '';
  const cleaned = sanitizeHtml(String(input), {
    allowedTags: [],
    allowedAttributes: {},
    // Transform href/src javascript: usages to empty string
    exclusiveFilter: (frame) => {
      if (frame.attribs) {
        for (const k of Object.keys(frame.attribs)) {
          const v = String(frame.attribs[k] || '');
          if (/^javascript:/i.test(v.trim())) return true;
        }
      }
      return false;
    },
  });

  return cleaned.trim();
}

/**
 * Recursively sanitize an object (req.body)
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result: Record<string, any> = Array.isArray(obj) ? [] as any : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === null || val === undefined) {
      result[key] = val;
    } else if (typeof val === 'string') {
      result[key] = sanitizeString(val);
    } else if (typeof val === 'object') {
      result[key] = sanitizeObject(val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}

export default {
  sanitizeString,
  sanitizeObject,
};
