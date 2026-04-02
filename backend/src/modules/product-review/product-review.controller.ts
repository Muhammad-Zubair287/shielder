/**
 * Product Review Controller
 * Handles HTTP requests for review operations
 */

import { Response } from 'express';
import { AuthRequest } from '@/types/global';
import { ProductReviewService } from './product-review.service';
import { asyncHandler } from '@/common/utils/helpers';
import { BadRequestError } from '@/common/errors/api.error';

export class ProductReviewController {
  /**
   * Add a new product review (customer only)
   */
  static addReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { productId, rating, title, comment } = req.body;

    const review = await ProductReviewService.addReview(userId, productId, rating, title, comment);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { review },
    });
  });

  /**
   * List product reviews by product or status
   */
  static listReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId, status, page = 1, limit = 10 } = req.query;

    const result = await ProductReviewService.listReviews(
      productId as string,
      status as string,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * Approve or reject a review (Super Admin only)
   */
  static approveReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      throw new BadRequestError('Approved field must be a boolean');
    }

    const result = await ProductReviewService.approveReview(id, approved);

    res.status(200).json({
      success: true,
      message: `Review ${approved ? 'approved' : 'rejected'} successfully`,
      data: { review: result },
    });
  });
}
