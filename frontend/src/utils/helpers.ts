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

  // Seed/demo images stored under images/products images/... are served
  // directly from the Next.js public folder (works on Vercel without a backend).
  const normalized = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  if (normalized.startsWith('images/')) {
    // Encode each path segment so spaces and special characters in folder/file
    // names (e.g. "products images") are valid in a URL.
    const encoded = normalized.split('/').map(encodeURIComponent).join('/');
    return `/${encoded}`;
  }
  
  // User-uploaded files (uploads/...) are served by the backend.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  const baseUrl = apiUrl.replace(/\/api(\/.*)?$/, '');
  
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
