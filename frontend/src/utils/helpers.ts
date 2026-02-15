/**
 * General Utility Helpers
 */

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
