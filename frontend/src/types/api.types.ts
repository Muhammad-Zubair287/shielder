/**
 * API Service Types
 * Type definitions for api.service.ts
 */

/**
 * Token refresh state for handling concurrent 401 responses
 * Prevents duplicate token refresh requests when multiple API calls fail with 401
 */
export type TokenRefreshPromise = Promise<string> | null;
