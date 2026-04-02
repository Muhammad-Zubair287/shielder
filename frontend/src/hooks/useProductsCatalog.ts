import { useEffect, useState } from 'react';
import apiClient from '@/services/api.service';
import { PRODUCTS_ITEMS_PER_PAGE } from '@/app/products/products.constants';

export interface ProductsCatalogFilters {
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
}

export interface ProductsCatalogProduct {
  id: string;
  name: string;
  description: string;
  price: number | string;
  originalPrice?: number | string;
  mainImage?: string;
  images?: string[];
  categoryName?: string;
  stock?: number;
  sku?: string;
  filterNumber?: string;
  alternateNumbers?: string;
  filterType?: string;
  material?: string;
  dimensions?: string;
}

export interface ProductsCatalogCategory {
  id: string;
  name: string;
}

interface UseProductsCatalogParams {
  filters: ProductsCatalogFilters;
  page: number;
  locale: string;
}

interface UseProductsCatalogResult {
  products: ProductsCatalogProduct[];
  total: number;
  loading: boolean;
  categories: ProductsCatalogCategory[];
}

const categoryCache: Record<string, ProductsCatalogCategory[]> = {};

function buildCatalogQuery(filters: ProductsCatalogFilters, page: number, locale: string) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  params.set('page', String(page));
  params.set('limit', String(PRODUCTS_ITEMS_PER_PAGE));
  params.set('locale', locale);
  return params;
}

export function useProductsCatalog({ filters, page, locale }: UseProductsCatalogParams): UseProductsCatalogResult {
  const [products, setProducts] = useState<ProductsCatalogProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ProductsCatalogCategory[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const query = buildCatalogQuery(filters, page, locale);
        const res = await apiClient.get(`inventory/products?${query.toString()}`);
        if (cancelled) return;

        const data = res.data;
        const items: ProductsCatalogProduct[] = data?.products ?? (Array.isArray(data?.data) ? data.data : []);
        setProducts(items);
        setTotal(data?.pagination?.total ?? data?.total ?? data?.meta?.total ?? items.length);
      } catch (error) {
        if (cancelled) return;
        console.error('[Products] API error:', error);
        setProducts([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, page, locale]);

  useEffect(() => {
    if (categoryCache[locale]) {
      setCategories(categoryCache[locale]);
      return;
    }

    (async () => {
      try {
        const res = await apiClient.get(`inventory/categories?limit=100&locale=${locale}`);
        const data = res.data;
        const mappedCategories: ProductsCatalogCategory[] = (data?.categories ?? data?.data ?? []).map(
          (category: { id: string; name?: string; translations?: Array<{ name?: string }>; nameEn?: string }) => ({
            id: category.id,
            name: category.name || category.translations?.[0]?.name || category.nameEn || 'Category',
          })
        );

        categoryCache[locale] = mappedCategories;
        setCategories(mappedCategories);
      } catch {
        setCategories([]);
      }
    })();
  }, [locale]);

  return { products, total, loading, categories };
}
