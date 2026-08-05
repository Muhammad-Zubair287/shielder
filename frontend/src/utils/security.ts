const UNSAFE_PATTERNS: RegExp[] = [
  /[\u0000-\u001F\u007F]/,
  /<[^>]+>/,
  /javascript:\s*/i,
  /on\w+\s*=/i,
  /(?:'|")\s*(?:or|and)\s*(?:'|")?\s*(?:\d+|true)/i,
  /\b(?:union\s+select|drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b/i,
];

const FULL_NAME_VALID_RE = /^(?=.*[\p{L}])[\p{L}\s''\-]+$/u;

export function hasUnsafeContent(value: string): boolean {
  return UNSAFE_PATTERNS.some(p => p.test(value));
}

export function isInvalidFullName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !FULL_NAME_VALID_RE.test(trimmed);
}
