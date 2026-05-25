import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api.service';
import { PRODUCTS_ITEMS_PER_PAGE } from '@/app/products/products.constants';
import { appendPriceRangeParams } from '@/app/products/price-filter';
import { resolveProductDescription, resolveProductImage, resolveProductImages, resolveProductName, type ProductAttachmentLike, type ProductDisplayLike, type ProductTranslationLike } from '@/utils/productDisplay';

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
  nameEn?: string;
  nameAr?: string;
  description: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number | string;
  originalPrice?: number | string;
  mainImage?: string;
  images?: string[];
  translations?: ProductTranslationLike[];
  attachments?: ProductAttachmentLike[];
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

function buildCatalogQuery(filters: ProductsCatalogFilters, page: number, locale: string) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  appendPriceRangeParams(params, { minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort) params.set('sort', filters.sort);
  params.set('page', String(page));
  params.set('limit', String(PRODUCTS_ITEMS_PER_PAGE));
  params.set('locale', locale);
  return params;
}

export function useProductsCatalog({ filters, page, locale }: UseProductsCatalogParams): UseProductsCatalogResult {
  const productsQueryKey = useMemo(
    () => [
      'products-catalog',
      locale,
      page,
      filters.search,
      filters.categoryId,
      filters.minPrice,
      filters.maxPrice,
      filters.inStock,
      filters.sort,
    ],
    [
      locale,
      page,
      filters.search,
      filters.categoryId,
      filters.minPrice,
      filters.maxPrice,
      filters.inStock,
      filters.sort,
    ]
  );

  const productsQuery = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => {
      try {
        const query = buildCatalogQuery(filters, page, locale);
        const res = await apiClient.get(`inventory/products?${query.toString()}`);
        const data = res.data;
        const items: ProductsCatalogProduct[] = data?.products ?? (Array.isArray(data?.data) ? data.data : []);

        return {
          products: items.map((item) => ({
            ...item,
            name: resolveProductName(item as ProductDisplayLike, locale),
            description: resolveProductDescription(item as ProductDisplayLike, locale),
            mainImage: resolveProductImage(item as ProductDisplayLike) ?? item.mainImage,
            images: resolveProductImages(item as ProductDisplayLike),
          })),
          total: data?.pagination?.total ?? data?.total ?? data?.meta?.total ?? items.length,
        };
      } catch (error) {
        console.error('[Products] API error:', error);
        return { products: [], total: 0 };
      }
    },
    // Shorter staleTime = more frequent refetches = fresher image URLs
    // 10 seconds to catch newly uploaded images
    staleTime: 10 * 1000,
    // Still cache for 5 mins to reduce API load
    gcTime: 5 * 60 * 1000,
    // IMPORTANT: Don't use old cached data as placeholder for images
    // When stale, show loading state instead of old images
    // This prevents showing "No Image" when the image was actually uploaded
    placeholderData: undefined,
  });

  const categoriesQuery = useQuery({
    queryKey: ['products-categories', locale],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`inventory/categories?limit=100&locale=${locale}`);
        const data = res.data;
        return (data?.categories ?? data?.data ?? []).map(
          (category: { id: string; name?: string; translations?: Array<{ name?: string }>; nameEn?: string }) => ({
            id: category.id,
            name: category.name || category.translations?.[0]?.name || category.nameEn || 'Category',
          })
        ) as ProductsCatalogCategory[];
      } catch {
        return [] as ProductsCatalogCategory[];
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    products: productsQuery.data?.products ?? [],
    total: productsQuery.data?.total ?? 0,
    loading: productsQuery.isLoading,
    categories: categoriesQuery.data ?? [],
  };
}
