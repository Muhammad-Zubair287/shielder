/**
 * Rate Limiter Test Utilities
 * Helpers for isolating and resetting rate limiter state in tests
 */

// @ts-ignore - This will be populated dynamically in tests
let rateLimitStore: Map<string, any> = new Map();

/**
 * Reset rate limiter state between tests
 * Call this in beforeEach() to ensure clean rate limit state
 */
export const resetRateLimiter = () => {
  rateLimitStore.clear();
};

/**
 * Get current rate limiter state (for assertions in tests)
 */
export const getRateLimiterState = () => {
  return new Map(rateLimitStore);
};

/**
 * Set rate limiter store reference (called during app initialization in test mode)
 * This allows tests to access and manipulate the rate limiter state
 */
export const setRateLimiterStore = (store: Map<string, any>) => {
  rateLimitStore = store;
};

/**
 * Mock rate limiter for specific endpoints in tests
 * Useful for testing behavior without hitting actual rate limits
 */
export const mockRateLimiterForEndpoint = (endpointPath: string) => {
  // Clear any existing entries for this endpoint
  Array.from(rateLimitStore.keys()).forEach(key => {
    if (key.includes(endpointPath)) {
      rateLimitStore.delete(key);
    }
  });
};

/**
 * Helper to create unique identifiers across test runs
 * Useful for creating test users/data that won't conflict with rate limiter keys
 */
export const getUniqueTestIdentifier = (prefix: string = 'test'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
