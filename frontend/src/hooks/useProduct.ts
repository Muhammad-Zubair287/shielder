/**
 * Hook for product data fetching
 * Centralizes API logic for product detail and related products
 */

import { useState, useEffect } from 'react';
import apiClient from '@/services/api.service';
import { resolveProductDescription, resolveProductImage, resolveProductName, type ProductAttachmentLike, type ProductDisplayLike, type ProductTranslationLike } from '@/utils/productDisplay';

export interface Product {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  translations?: ProductTranslationLike[];
  price: number | string;
  originalPrice?: number | string;
  mainImage?: string;
  images?: string[];
  attachments?: Array<ProductAttachmentLike>;
  category?: { id?: string; name: string };
  categoryId?: string;
  categoryName?: string;
  stock?: number;
  sku?: string;
  filterNumber?: string;
  alternateNumbers?: string;
  filterType?: string;
  material?: string;
  dimensions?: string;
  status?: string;
  specifications?: Array<{
    id: string;
    spec_key: string;
    spec_value: string;
  }>;
  attachments?: Array<{
    id: string;
    type: 'IMAGE' | 'DATASHEET' | 'MANUAL' | 'CERTIFICATE';
    fileName: string;
    fileUrl: string;
    mimeType: string;
    language: string;
  }>;
}

interface UseProductResult {
  product: Product | null;
  relatedProducts: Product[];
  loading: boolean;
  error: string | null;
}

export const useProduct = (productId: string, locale = 'en'): UseProductResult => {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product detail
        const productRes = await apiClient.get(`/inventory/products/${productId}`, {
          params: { locale },
          headers: { Accept: 'application/json' },
        });
        const productData: Product = productRes.data?.data || productRes.data;
        const normalizedProduct = {
          ...productData,
          name: resolveProductName(productData as ProductDisplayLike, locale),
          description: resolveProductDescription(productData as ProductDisplayLike, locale),
          mainImage: resolveProductImage(productData as ProductDisplayLike) ?? productData.mainImage,
        };
        setProduct(normalizedProduct);

        // Fetch related products
        const categoryId = productData?.categoryId || productData?.category?.id;
        if (categoryId) {
          const relatedRes = await apiClient.get('/inventory/products', {
            params: {
              categoryId,
              limit: 4,
              locale,
            },
            headers: { Accept: 'application/json' },
          });
          const relatedData: Product[] = relatedRes.data?.products || relatedRes.data?.data || [];
          setRelatedProducts(
            relatedData
              .filter((item) => item.id !== productId)
              .slice(0, 3)
              .map((item) => ({
                ...item,
                name: resolveProductName(item as ProductDisplayLike, locale),
                description: resolveProductDescription(item as ProductDisplayLike, locale),
                mainImage: resolveProductImage(item as ProductDisplayLike) ?? item.mainImage,
              }))
          );
        } else {
          setRelatedProducts([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
        setProduct(null);
        setRelatedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId, locale]);

  return { product, relatedProducts, loading, error };
};
