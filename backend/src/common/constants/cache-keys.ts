export const CACHE_KEYS = {
  SUPERADMIN_DASHBOARD_SUMMARY: 'superadmin:dashboard:summary:v1',
  SUPERADMIN_MONTHLY_ANALYTICS: 'superadmin:analytics:monthly:v1',
} as const;

export const CACHE_TTL_SECONDS = {
  SUPERADMIN_DASHBOARD_SUMMARY: 60,
  SUPERADMIN_MONTHLY_ANALYTICS: 120,
} as const;
