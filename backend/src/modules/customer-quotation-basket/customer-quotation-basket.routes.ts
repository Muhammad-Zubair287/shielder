/**
 * Customer Quotation Basket Routes
 */

import { Router } from 'express';
import { CustomerQuotationBasketController } from './customer-quotation-basket.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

/**
 * All quotation basket routes require authentication
 */
router.use(authenticate);

// GET /api/customer/quotation-basket - Get user's quotation basket
router.get('/', CustomerQuotationBasketController.getBasket);

// POST /api/customer/quotation-basket/items - Add or update item
router.post('/items', CustomerQuotationBasketController.addUpdateItem);

// PATCH /api/customer/quotation-basket/items/:productId - Update item quantity
router.patch('/items/:productId', CustomerQuotationBasketController.updateItemQuantity);

// DELETE /api/customer/quotation-basket/items/:productId - Remove item from basket
router.delete('/items/:productId', CustomerQuotationBasketController.removeItem);

// DELETE /api/customer/quotation-basket - Clear entire basket
router.delete('/', CustomerQuotationBasketController.clearBasket);

export default router;
