/**
 * General Utility Helpers
 */

/**
 * Get full image URL from relative upload path
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  
  // If it's already a full URL (http, https, blob, data), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') ||
      imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Seed/demo images stored under images/products-images/... or images/userend-images/...
  // are served directly from the Next.js public folder (works on Vercel without a backend).
  const normalized = (imagePath.startsWith('/') ? imagePath.slice(1) : imagePath)
    // Normalize legacy folder names that had spaces
    .replace('images/products images/', 'images/products-images/')
    .replace('images/UserEnd images/', 'images/userend-images/')
    .replace('images/userend images/', 'images/userend-images/');

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

  // Resolve backend origin safely. Prefer explicit uploads base, then absolute API URL.
  let baseUrl = '';
  if (uploadsBase && /^https?:\/\//i.test(uploadsBase)) {
    baseUrl = uploadsBase.replace(/\/$/, '');
  } else if (/^https?:\/\//i.test(apiUrl)) {
    baseUrl = apiUrl.replace(/\/api(\/.*)?$/, '').replace(/\/$/, '');
  } else if (typeof window !== 'undefined') {
    // If API URL is relative/missing, avoid empty-string joins that create broken URLs.
    baseUrl = window.location.origin;
  } else {
    baseUrl = 'http://localhost:5001';
  }
  
  // Ensure imagePath starts with /
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${baseUrl}${path}`;
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
