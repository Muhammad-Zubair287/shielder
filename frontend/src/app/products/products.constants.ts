export const PRODUCTS_ITEMS_PER_PAGE = 12;

export const PRODUCTS_SORT_OPTIONS = [
  { value: 'newest', labelKey: 'productsSortNewest' },
  { value: 'price_asc', labelKey: 'productsSortPriceLow' },
  { value: 'price_desc', labelKey: 'productsSortPriceHigh' },
  { value: 'best_selling', labelKey: 'productsSortBestSelling' },
] as const;

export const PRODUCT_UI_LABELS = {
  noImage: 'No Image',
  detailTitle: 'Product Details',
  type: 'Type:',
  material: 'Material:',
  dimensions: 'Dimensions:',
} as const;
