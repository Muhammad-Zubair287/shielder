import sanitizeHtml from 'sanitize-html';

type SanitizerFrame = {
  attribs?: Record<string, string | undefined>;
};

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
    exclusiveFilter: (frame: SanitizerFrame) => {
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

/**
 * Sanitize HTML content but allow a safe subset of tags/attributes suitable for CMS-like fields
 */
export function sanitizeHtmlAllowlist(input: string | undefined | null): string {
  if (!input) return '';
  // Allow a conservative set of tags and attributes for policy/terms content
  const cleaned = sanitizeHtml(String(input), {
    allowedTags: [
      'a', 'b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: [],
    },
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto']
    },
    // Remove any javascript: URIs
    transformTags: {
      'a': (tagName, attribs) => {
        const href = attribs.href || '';
        if (/^javascript:/i.test(href)) {
          delete attribs.href;
        }
        // enforce rel and target
        attribs.rel = 'nofollow noopener noreferrer';
        attribs.target = '_blank';
        return { tagName, attribs };
      }
    }
  });

  return cleaned.trim();
}

export default {
  sanitizeString,
  sanitizeObject,
};
