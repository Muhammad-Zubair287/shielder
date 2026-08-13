/**
 * Phone/mobile client detection for Contact CAPTCHA policy.
 *
 * The backend is the authority: CAPTCHA is required for non-phone clients and
 * optional for phone clients. Detection uses the request User-Agent header
 * (not a client-supplied body flag), so a desktop client cannot bypass CAPTCHA
 * by posting `{ isMobile: true }`.
 *
 * Known limitation: User-Agent can be spoofed. That is inherent to UA-based
 * detection and matches the existing Contact module architecture.
 *
 * Keep the regex in sync with frontend/src/utils/device.ts.
 */
export function isPhoneUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}
