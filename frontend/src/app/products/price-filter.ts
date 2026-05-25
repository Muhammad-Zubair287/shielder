export type PriceRangeFilters = {
  minPrice?: string;
  maxPrice?: string;
};

export const hasPriceFilterValue = (value: string | undefined | null): boolean => {
  if (value === undefined || value === null) return false;
  return value.trim() !== '';
};

export const parsePriceFilterValue = (value: string | undefined | null): number | null => {
  if (value === undefined || value === null) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const getPriceRangeValidationKey = (filters: PriceRangeFilters): string | null => {
  const hasMin = hasPriceFilterValue(filters.minPrice);
  const hasMax = hasPriceFilterValue(filters.maxPrice);

  if (!hasMin && !hasMax) return null;

  const minPrice = parsePriceFilterValue(filters.minPrice);
  const maxPrice = parsePriceFilterValue(filters.maxPrice);

  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
    return 'productsPriceValidationInvalid';
  }

  if ((minPrice !== null && minPrice < 0) || (maxPrice !== null && maxPrice < 0)) {
    return 'productsPriceValidationInvalid';
  }

  if (hasMin && hasMax && minPrice !== null && maxPrice !== null && maxPrice < minPrice) {
    return 'productsPriceValidationRange';
  }

  return null;
};

export const appendPriceRangeParams = (minPrice?: string, maxPrice?: string): URLSearchParams => {
  const params = new URLSearchParams();

  if (hasPriceFilterValue(minPrice)) {
    params.set('minPrice', minPrice!.trim());
  }

  if (hasPriceFilterValue(maxPrice)) {
    params.set('maxPrice', maxPrice!.trim());
  }

  return params;
};
