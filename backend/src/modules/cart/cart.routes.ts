import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../auth/auth.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { cartValidation } from './cart.validation';

const router = Router();

/**
 * All cart routes require authentication
 */
router.use(authenticate);

// GET /api/cart - Get user cart
router.get('/', CartController.getCart);

// POST /api/cart/add - Add item to cart
router.post('/add', validate(cartValidation.addItem), CartController.addItem);

// PUT /api/cart/update - Update item quantity
router.put('/update', validate(cartValidation.addItem), CartController.updateItem);

// DELETE /api/cart/remove/:productId - Remove item from cart
router.delete('/remove/:productId', CartController.removeItem);

// DELETE /api/cart/clear - Clear cart
router.delete('/clear', CartController.clearCart);

export default router;
