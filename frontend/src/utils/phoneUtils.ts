export function filterPhoneInput(raw: string): string {
  let result = raw.replace(/[^0-9+ ]/g, '');
  if (result.includes('+')) {
    const hasLeadingPlus = result.startsWith('+');
    result = result.replace(/\+/g, '');
    if (hasLeadingPlus) result = '+' + result;
  }
  result = result.replace(/  +/g, ' ');
  return result.slice(0, 20);
}

export const PHONE_REGEX = /^\+?[0-9 ]{7,20}$/;

export function validatePhone(
  value: string,
  required = false,
  t: (key: string) => string = (k) => k,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? t('phoneRequired') : null;
  if (!PHONE_REGEX.test(trimmed) || !/[0-9]/.test(trimmed)) {
    return t('invalidPhone');
  }
  return null;
}
