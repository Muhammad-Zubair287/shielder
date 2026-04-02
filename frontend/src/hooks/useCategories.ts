/**
 * Hook for categories fetching
 * Centralizes API logic for category data with locale support
 */

import { useState, useEffect } from 'react';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export const useCategories = (locale: string = 'en'): UseCategoriesResult => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
        const res = await fetch(`${apiUrl}/inventory/categories?limit=100&locale=${locale}`, {
          headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch categories: ${res.statusText}`);
        }

        const data = await res.json();
        const categoriesData = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

        const mapped: Category[] = categoriesData.map((cat: {
          id: string;
          name?: string;
          slug?: string;
          image?: string;
          _count?: { products?: number };
        }) => ({
          id: cat.id,
          name: cat.name || '',
          slug: cat.slug || '',
          image: cat.image,
          productCount: cat._count?.products,
        }));

        setCategories(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch categories');
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [locale]);

  return { categories, loading, error };
};
