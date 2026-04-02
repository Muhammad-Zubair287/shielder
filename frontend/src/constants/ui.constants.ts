/**
 * UI Constants - Centralized hardcoded strings and labels
 * Ensures consistency across the application
 */

export const SORT_OPTIONS = {
  NEWEST: { label: 'Newest', value: 'newest' },
  OLDEST: { label: 'Oldest', value: 'oldest' },
  PRICE_LOW_HIGH: { label: 'Price: Low to High', value: 'price_asc' },
  PRICE_HIGH_LOW: { label: 'Price: High to Low', value: 'price_desc' },
  MOST_POPULAR: { label: 'Most Popular', value: 'popular' },
  BEST_RATED: { label: 'Best Rated', value: 'rated' },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZES: [12, 24, 48],
  PAGE_SIZE_LABEL: 'Items per page:',
} as const;

export const PRODUCT_COMPARE = {
  MAX_ITEMS: 3,
  EMPTY_MESSAGE: 'No products selected for comparison',
  MAX_REACHED: `You can compare up to ${3} products`,
  COMPARE_BUTTON_TEXT: 'Compare',
  REMOVE_TEXT: 'Remove',
  CLEAR_ALL_TEXT: 'Clear All',
  ADD_TEXT: 'Add to Compare',
  ADDED_TEXT: 'Added to Compare',
} as const;

export const FORM_LABELS = {
  SEARCH: 'Search products, SKU, or category...',
  FILTER_BY_CATEGORY: 'Filter by Category',
  FILTER_BY_PRICE: 'Filter by Price',
  FILTER_BY_STOCK: 'In Stock Only',
  MIN_PRICE: 'Min Price',
  MAX_PRICE: 'Max Price',
  APPLY_FILTERS: 'Apply Filters',
  CLEAR_FILTERS: 'Clear All',
  SORT_BY: 'Sort By',
} as const;

export const CONTACT_FORM = {
  NAME_LABEL: 'Your Name',
  EMAIL_LABEL: 'Email Address',
  PHONE_LABEL: 'Phone Number (Optional)',
  SUBJECT_LABEL: 'Subject',
  MESSAGE_LABEL: 'Message',
  MESSAGE_MAX_LENGTH: 5000,
  FILE_UPLOAD_LABEL: 'Attach File (Optional)',
  FILE_MAX_SIZE_MB: 5,
  CAPTCHA_LABEL: 'I am not a robot',
  SUBMIT_BUTTON: 'Send Message',
  SENDING: 'Sending...',
  SUCCESS_MESSAGE: 'Thank you! Your message has been sent.',
  ERROR_MESSAGE: 'Failed to send message. Please try again.',
} as const;

export const CAPTCHA_LABELS = {
  VERIFIED_TITLE: 'Verified',
  VERIFIED_SUBTITLE: 'You are not a robot',
  TOO_MANY_ATTEMPTS: 'Too many attempts',
  FALLBACK_MESSAGE: 'Please verify using the fallback method below.',
  FALLBACK_BUTTON: 'Verify via Alternative Method',
  SECURE_TITLE: 'Secure CAPTCHA Verification',
  VERIFYING: 'Verifying...',
  VERIFY_PROVIDER: 'Verify with reCAPTCHA',
  TROUBLE_PREFIX: 'Having trouble?',
  ACCESSIBILITY_OPTION: 'Use accessibility option',
  ROBOT_CHECK_TITLE: 'Verify you are not a robot',
  ANSWER_PLACEHOLDER: 'Enter your answer',
  CHECK_BUTTON: 'Check',
  INCORRECT_PREFIX: 'Incorrect.',
  ATTEMPTS_SUFFIX: 'attempts remaining.',
} as const;

export const AUTH_FORM = {
  LOGIN_TITLE: 'Sign In',
  SIGNUP_TITLE: 'Create Account',
  EMAIL_PLACEHOLDER: 'you@example.com',
  PASSWORD_PLACEHOLDER: 'Enter your password',
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_STRENGTH: {
    WEAK: 'Weak',
    FAIR: 'Fair',
    GOOD: 'Good',
    STRONG: 'Strong',
  },
  SHOW_PASSWORD: 'Show',
  HIDE_PASSWORD: 'Hide',
  FORGOT_PASSWORD_LINK: 'Forgot password?',
  REMEMBER_ME: 'Remember me',
  LOGIN_BUTTON: 'Sign In',
  SIGNUP_BUTTON: 'Create Account',
  ALREADY_HAVE_ACCOUNT: 'Already have an account?',
  DONT_HAVE_ACCOUNT: "Don't have an account?",
} as const;

export const TOAST_MESSAGES = {
  ADDED_TO_CART: 'Added to cart',
  REMOVED_FROM_CART: 'Removed from cart',
  ADDED_TO_COMPARE: 'Added to comparison',
  ADDED_TO_QUOTATION: 'added to quotation basket',
  REMOVED_FROM_COMPARE: 'Removed from comparison',
  COMPARE_LIMIT_REACHED: `Maximum 3 products can be compared`,
  LOGIN_REQUIRED: 'Please log in to continue',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  SUCCESS: 'Operation completed successfully',
  ERROR_OCCURRED: 'An error occurred',
  LOADING: 'Loading...',
} as const;

export const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export const DASHBOARD_LABELS = {
  NO_RECENT_ACTIVITY: 'No recent activity found.',
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
  INVALID_PHONE: 'Please enter a valid phone number',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  FIELD_TOO_LONG: (max: number) => `Maximum ${max} characters allowed`,
  FIELD_TOO_SHORT: (min: number) => `Minimum ${min} characters required`,
} as const;

export const NAV_LINKS = {
  HOME: { label: 'Home', href: '/' },
  PRODUCTS: { label: 'Products', href: '/products' },
  CONTACT: { label: 'Contact', href: '/contact' },
  LOGIN: { label: 'Login', href: '/login' },
  SIGNUP: { label: 'Sign Up', href: '/register' },
  MY_ORDERS: { label: 'My Orders', href: '/my-orders' },
  MY_QUOTATIONS: { label: 'My Quotations', href: '/my-quotation' },
  ADMIN_PANEL: { label: 'Admin Panel', href: '/admin' },
  SUPERADMIN_PANEL: { label: 'Super Admin', href: '/superadmin' },
} as const;
