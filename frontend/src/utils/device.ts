/**
 * Phone/mobile client detection for Contact CAPTCHA UX.
 *
 * Must stay aligned with backend Contact CAPTCHA policy
 * (`backend/src/modules/contact/contact-device.util.ts`):
 * - Backend skips CAPTCHA verification for phone User-Agents
 * - Frontend hides CAPTCHA and skips client-side CAPTCHA validation for the same UA pattern
 *
 * Do not use viewport width for this security-sensitive UX gate — a narrow desktop
 * window must still require CAPTCHA, and the backend never trusts client width flags.
 */
export function isPhoneUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}
