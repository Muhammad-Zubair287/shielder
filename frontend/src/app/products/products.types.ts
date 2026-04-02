export interface Product {
  id: string;
  name: string;
  description: string;
  price: number | string;
  originalPrice?: number | string;
  mainImage?: string;
  images?: string[];
  category?: { name: string };
  categoryName?: string;
  stock?: number;
  sku?: string;
  filterNumber?: string;
  alternateNumbers?: string;
  filterType?: string;
  material?: string;
  dimensions?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ActiveFilters {
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
}

export type ProductTab = 'buy' | 'quotation';
