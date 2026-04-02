/**
 * Product Review Service
 * Handles review creation, approval, and listing with RBAC enforcement
 */

import { prisma } from '@/config/database';
import { NotFoundError, BadRequestError } from '@/common/errors/api.error';
import { logger } from '@/common/logger/logger';

type ReviewStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED';

export class ProductReviewService {
  /**
   * Add a new product review (customer only)
   * Prevents duplicate reviews from same customer for same product
   */
  static async addReview(
    customerId: string,
    productId: string,
    rating: number,
    title: string,
    comment: string
  ) {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check if customer already reviewed this product
    const existingReview = await prisma.productReview.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: customerId,
        },
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new BadRequestError('You have already reviewed this product');
    }

    // Create review (goes to PENDING status)
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId: customerId,
        rating,
        title,
        comment,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, email: true } },
        product: { select: { id: true } },
      },
    });

    logger.info(`Product review created: ${review.id} for product ${productId}`);

    return {
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      title: review.title,
      status: review.status,
      createdAt: review.createdAt,
    };
  }

  /**
   * List product reviews (public, filtered by status APPROVED only for customers)
   */
  static async listReviews(productId?: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where: { productId?: string; status?: ReviewStatusValue } = {};
    if (productId) where.productId = productId;
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status as ReviewStatusValue;
    }

    const reviews = await prisma.productReview.findMany({
      where,
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, profile: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.productReview.count({ where });

    return {
      reviews: reviews.map(r => ({
        id: r.id,
        productId: r.productId,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        status: r.status,
        authorName: r.user?.profile?.fullName || 'Anonymous',
        createdAt: r.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approve or reject a review (Super Admin only)
   */
  static async approveReview(reviewId: string, approved: boolean) {
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
      select: { id: true, status: true },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    if (review.status !== 'PENDING') {
      throw new BadRequestError('Only pending reviews can be approved/rejected');
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        productId: true,
      },
    });

    logger.info(`Product review ${approved ? 'approved' : 'rejected'}: ${reviewId}`);

    return {
      id: updatedReview.id,
      status: updatedReview.status,
      productId: updatedReview.productId,
    };
  }
}
