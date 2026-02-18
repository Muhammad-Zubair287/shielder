/**
 * Application Constants
 * Centralized constants for the application
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  TIMEOUT: 30000, // 30 seconds
} as const;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: 'auth/signup',
    LOGIN: 'auth/login',
    LOGOUT: 'auth/logout',
    REFRESH_TOKEN: 'auth/refresh',
    ME: 'auth/me',
    VERIFY_EMAIL: 'auth/verify-email', // Note: backend expects GET /verify-email/:token
  },
  // Users
  USERS: {
    BASE: 'profile',
    BY_ID: (id: string) => `super-admin/users/${id}`,
    UPDATE_PROFILE: 'profile',
  },
  // Products
  PRODUCTS: {
    BASE: 'inventory/products',
    BY_ID: (id: string) => `inventory/products/${id}`,
    BY_CATEGORY: (categoryId: string) => `inventory/products?categoryId=${categoryId}`,
    LOW_STOCK: 'products/low-stock',
    BULK_UPLOAD: 'inventory/products/bulk-upload',
    TEMPLATE: 'inventory/products/template',
  },
  // Super Admin
  SUPER_ADMIN: {
    SUMMARY: 'super-admin/dashboard/summary',
    ANALYTICS_MONTHLY: 'super-admin/analytics/monthly',
    ACTIVITY: 'super-admin/activity',
    USERS: 'super-admin/users/all',
    USER_STATS: 'super-admin/users/stats',
    USER_CREATE: 'super-admin/users/create',
    USER_BY_ID: (id: string) => `super-admin/users/${id}`,
  },
  // Admin Management
  ADMINS: {
    BASE: 'admins',
    SUMMARY: 'admins/summary',
    BY_ID: (id: string) => `admins/${id}`,
    STATUS: (id: string) => `admins/${id}/status`,
  },
  // Categories
  CATEGORIES: {
    BASE: 'inventory/categories',
    BY_ID: (id: string) => `inventory/categories/${id}`,
  },
  // Subcategories
  SUBCATEGORIES: {
    BASE: 'inventory/subcategories',
    BY_ID: (id: string) => `inventory/subcategories/${id}`,
  },
  // Orders
  ORDERS: {
    BASE: 'orders',
    BY_ID: (id: string) => `orders/${id}`,
    UPDATE_STATUS: (id: string) => `orders/${id}/status`,
  },
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'shielder_access_token',
  REFRESH_TOKEN: 'shielder_refresh_token',
  USER: 'shielder_user',
  LOCALE: 'shielder_locale',
  CART: 'shielder_cart',
} as const;

/**
 * User Roles
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'USER',
  DEALER: 'SUPPLIER',
  SALES: 'sales',
} as const;

/**
 * User Status
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

/**
 * Product Status
 */
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

/**
 * Order Status
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

/**
 * Order Type
 */
export const ORDER_TYPE = {
  QUOTE: 'quote',
  ORDER: 'order',
} as const;

/**
 * Supported Locales
 */
export const LOCALES = {
  EN: 'en',
  AR: 'ar',
} as const;

/**
 * Default Locale
 */
export const DEFAULT_LOCALE = LOCALES.EN;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
  PASSWORD_MIN_LENGTH: 8,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful! Please verify your email.',
  LOGOUT_SUCCESS: 'Logout successful!',
  UPDATE_SUCCESS: 'Updated successfully!',
  CREATE_SUCCESS: 'Created successfully!',
  DELETE_SUCCESS: 'Deleted successfully!',
} as const;

/**
 * Routes
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  
  // Public
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  CONTACT: '/contact',
  ABOUT: '/about',
  
  // Customer
  CUSTOMER_DASHBOARD: '/customer/dashboard',
  CUSTOMER_ORDERS: '/customer/orders',
  CUSTOMER_PROFILE: '/customer/profile',
  
  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_PRODUCTS: '/admin/approvals',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_USERS: '/admin/users',
  ADMIN_REPORTS: '/admin/analytics',

  // Super Admin
  SUPER_ADMIN_DASHBOARD: '/superadmin/dashboard',
  SUPER_ADMIN_USERS: '/superadmin/users',
  SUPER_ADMIN_PRODUCTS: '/superadmin/products',
} as const;
