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
 * Sanitize HTML content but allow a safe subset of tags/attributes suitable for Quill rich-text editor
 * Conservative allowlist matching Quill's standard formats
 */
export function sanitizeHtmlAllowlist(input: string | undefined | null): string {
  if (!input) return '';
  // Quill-compatible: text formatting, lists, headers, code, links, images, tables
  const cleaned = sanitizeHtml(String(input), {
    allowedTags: [
      // Text formatting
      'b', 'i', 'em', 'strong', 'u', 's', 'del', 'ins', 'sub', 'sup',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists & structure
      'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'hr',
      // Code
      'code', 'pre',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
      // Links & media
      'a', 'img', 'video', 'source',
      // Semantic
      'span', 'div',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style'],
      video: ['src', 'controls', 'width', 'height'],
      source: ['src', 'type'],
      span: ['style', 'class'],
      div: ['style', 'class'],
      table: ['border', 'cellpadding', 'cellspacing'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
      col: ['width'],
    },
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'ftp'],
      img: ['http', 'https', 'data'],
      video: ['http', 'https'],
      source: ['http', 'https'],
    },
    // Strip dangerous style properties
    allowedStyles: {
      '*': {
        'color': [/^#(0x)?[0-9A-F]{6}$/i, /^rgb/, /^inherit/, /^currentColor/, /^transparent/],
        'background-color': [/^#(0x)?[0-9A-F]{6}$/i, /^rgb/, /^inherit/],
        'text-align': [/^left$/, /^center$/, /^right$/, /^justify$/],
        'font-weight': [/^bold$/, /^normal$/, /^[1-9]00$/],
        'font-style': [/^italic$/, /^normal$/],
        'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
        'margin': [/^\d+(%|px|em|rem)$/],
        'padding': [/^\d+(%|px|em|rem)$/],
        'width': [/^\d+(%|px|em|rem)$/],
        'height': [/^\d+(%|px|em|rem)$/],
      },
    },
    // Strictest iframe handling: remove completely
    disallowedTagsMode: 'discard',
    nonBooleanAttributes: ['class', 'style'],
    // Remove any javascript: URIs
    transformTags: {
      'a': (tagName, attribs) => {
        const href = attribs.href || '';
        if (/^javascript:/i.test(href)) {
          delete attribs.href;
        }
        // enforce security attributes on external links
        attribs.rel = attribs.rel ? `${attribs.rel} nofollow noopener noreferrer` : 'nofollow noopener noreferrer';
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
