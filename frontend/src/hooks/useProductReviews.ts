import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/services/api.service';

export interface ProductReviewItem {
  id: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  authorName: string;
  createdAt: string;
}

interface ProductReviewsResponse {
  reviews: ProductReviewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useProductReviews = (productId: string, limit = 10) => {
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!productId) {
        setReviews([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ success: boolean; data: ProductReviewsResponse }>('/reviews', {
          params: {
            productId,
            status: 'APPROVED',
            page: 1,
            limit,
          },
        });

        const responseData = response.data?.data;
        setReviews(responseData?.reviews || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId, limit]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  return {
    reviews,
    loading,
    error,
    averageRating,
    reviewCount: reviews.length,
  };
};
