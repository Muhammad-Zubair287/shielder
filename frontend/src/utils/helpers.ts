/**
 * General Utility Helpers
 */

/**
 * Get full image URL from relative upload path
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;

  // If it's already a full URL (http, https, blob, data), return as is
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('blob:') ||
    imagePath.startsWith('data:')
  ) {
    return imagePath;
  }

  // Seed/demo images stored under images/products-images/... or images/userend-images/...
  // are served directly from the Next.js public folder (works on Vercel without a backend).
  const normalized = (imagePath.startsWith('/') ? imagePath.slice(1) : imagePath)
    // Normalize legacy folder names that had spaces
    .replace('images/products images/', 'images/products-images/')
    .replace('images/UserEnd images/', 'images/userend-images/')
    .replace('images/userend images/', 'images/userend-images/')
    // Normalize accidental nested upload path produced by old scripts
    .replace(/^uploads\/products\/products\//, 'uploads/products/');

  if (normalized.startsWith('images/')) {
    // Preserve the exact filename/path from DB and only URL-encode each path segment.
    const encoded = normalized
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `/${encoded}`;
  }

  // User-uploaded files (uploads/...) are served by the backend.
  const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // Resolve backend origin safely.
  // Important: when running the frontend locally, always prefer local backend
  // even if NEXT_PUBLIC_UPLOADS_BASE_URL points to a production host.
  let backendOrigin = '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1';

    if (isLocalHost) {
      backendOrigin = `http://${host}:5001`;
    }
  }

  // Non-local environments: prefer explicit uploads base, then absolute API URL.
  if (!backendOrigin && uploadsBase && /^https?:\/\//i.test(uploadsBase)) {
    backendOrigin = uploadsBase.replace(/\/$/, '');
  } else if (!backendOrigin && /^https?:\/\//i.test(apiUrl)) {
    backendOrigin = apiUrl.replace(/\/api(\/.*)?$/, '').replace(/\/$/, '');
  } else if (!backendOrigin && typeof window !== 'undefined') {
    backendOrigin = window.location.origin;
  } else {
    backendOrigin = 'http://localhost:5001';
  }

  // Ensure image path starts with /
  const uploadPath = normalized.startsWith('/') ? normalized : `/${normalized}`;

  // URL-encode each path segment while preserving slashes.
  const encodedPath = uploadPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
    .replace(/%3A/g, ':');

  return `${backendOrigin}${encodedPath}`;
};

/**
 * Formats a number as SAR currency
 */
export const formatCurrency = (amount: number | string): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Truncates text with ellipsis
 */
export const truncateText = (text: string, length: number): string => {
  if (text.length <= (length || 0)) return text;
  return text.slice(0, length) + '...';
};

/**
 * Formats date to a readable string
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
