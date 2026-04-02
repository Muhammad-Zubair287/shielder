/**
 * Product Review Validation
 * Schema and rule definitions for review submissions and approvals
 */

import Joi from 'joi';

export const productReviewValidation = {
  addReview: Joi.object({
    productId: Joi.string().uuid().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().min(3).max(100).required(),
    comment: Joi.string().trim().min(10).max(1000).required(),
  }),

  approveReview: Joi.object({
    approved: Joi.boolean().required(),
  }),

  listReviews: Joi.object({
    productId: Joi.string().uuid(),
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
