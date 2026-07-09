/**
 * General Utility Helpers
 */

/**
 * Get full image URL from relative upload path
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;

  // Trim whitespace and normalize backslashes
  let path = imagePath.trim().replace(/\\+/g, '/');

  const splitQuery = (value: string) => {
    const queryIndex = value.indexOf('?');
    if (queryIndex === -1) {
      return { pathname: value, query: '' };
    }

    return {
      pathname: value.slice(0, queryIndex),
      query: value.slice(queryIndex),
    };
  };

  // Protocol-relative URLs (//cdn.example.com/...) - preserve by adding current protocol
  if (path.startsWith('//') && typeof window !== 'undefined') {
    return `${window.location.protocol}${path}`;
  }

  // If it's already a full URL (http, https, blob, data), return as is
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  // Normalize common legacy/public folder names and accidental nested upload paths
  const { pathname: rawPath, query } = splitQuery(path);

  const normalized = (rawPath.startsWith('/') ? rawPath.slice(1) : rawPath)
    .replace('images/products images/', 'images/products-images/')
    .replace('images/UserEnd images/', 'images/userend-images/')
    .replace('images/userend images/', 'images/userend-images/')
    .replace(/^uploads\/products\/products\//, 'uploads/products/');

  const getBackendOrigin = () => {
    const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

    if (uploadsBase && /^https?:\/\//i.test(uploadsBase)) {
      return uploadsBase.replace(/\/$/, '');
    }

    if (/^https?:\/\//i.test(apiUrl)) {
      return apiUrl.replace(/\/api(\/.*)?$/, '').replace(/\/$/, '');
    }

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalHost =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1';

      // On localhost fall back to the default backend dev port.
      // On a real server NEXT_PUBLIC_UPLOADS_BASE_URL or NEXT_PUBLIC_API_URL
      // must be set — do NOT use window.location.origin because the frontend
      // and backend are on different ports/domains.
      return isLocalHost ? `http://${host}:5001` : '';
    }

    return 'http://localhost:5001';
  };

  if (normalized.startsWith('images/products-images/')) {
    const backendOrigin = getBackendOrigin();

    const encodedProductPath = normalized
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
      .replace(/%3A/g, ':');

    return `${backendOrigin}/${encodedProductPath}${query}`;
  }

  if (normalized.startsWith('images/')) {
    const encoded = normalized
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `/${encoded}${query}`;
  }

  // User-uploaded files (uploads/...) are served by the backend.
  const backendOrigin = getBackendOrigin();

  const uploadPath = normalized.startsWith('/') ? normalized : `/${normalized}`;

  const encodedPath = uploadPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
    .replace(/%3A/g, ':');

  return `${backendOrigin}${encodedPath}${query}`;
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
