import { useEffect, useState } from 'react';
import apiClient from '@/services/api.service';

export interface ProductSearchItem {
  id: string;
  name?: string;
  price?: number | string;
  stock?: number;
  translations?: Array<{ name?: string }>;
}

interface UseProductSearchResult {
  results: ProductSearchItem[];
  searching: boolean;
}

export function useProductSearch(search: string, limit = 5): UseProductSearchResult {
  const [results, setResults] = useState<ProductSearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await apiClient.get('/inventory/products', {
          params: { search, limit },
        });
        setResults(res.data?.data?.products || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [search, limit]);

  return { results, searching };
}
