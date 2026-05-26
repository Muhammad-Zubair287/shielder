/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Customer Quotation Basket Controller
 * REST endpoints for managing customer's quotation basket
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/global';
import { BadRequestError } from '../../common/errors/api.error';
import { CustomerQuotationBasketService } from './customer-quotation-basket.service';
import {
  validateAddUpdateItem,
  validateUpdateQuantity,
} from './customer-quotation-basket.validation';

export class CustomerQuotationBasketController {
  /**
   * @swagger
   * /api/customer/quotation-basket:
   *   get:
   *     summary: Get customer's quotation basket
   *     tags: [Customer Quotation Basket]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Basket retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  static async getBasket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const basket = await CustomerQuotationBasketService.getBasket(userId);
      res.status(200).json({
        success: true,
        data: basket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/customer/quotation-basket/items:
   *   post:
   *     summary: Add or update item in quotation basket
   *     tags: [Customer Quotation Basket]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [productId, quantity]
   *             properties:
   *               productId:
   *                 type: string
   *                 description: UUID of product
   *               quantity:
   *                 type: integer
   *                 minimum: 1
   *     responses:
   *       200:
   *         description: Item added/updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  static async addUpdateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { error, value } = validateAddUpdateItem(req.body);

      if (error) {
        throw new BadRequestError(error.message);
      }

      const basket = await CustomerQuotationBasketService.addItem(
        userId,
        value.productId,
        value.quantity
      );

      res.status(200).json({
        success: true,
        data: basket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/customer/quotation-basket/items/{productId}:
   *   patch:
   *     summary: Update item quantity
   *     tags: [Customer Quotation Basket]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [quantity]
   *             properties:
   *               quantity:
   *                 type: integer
   *                 minimum: 1
   *     responses:
   *       200:
   *         description: Quantity updated successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Item not found in basket
   */
  static async updateItemQuantity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { productId } = req.params as { productId: string };
      const { error, value } = validateUpdateQuantity(req.body);

      if (error) {
        throw new BadRequestError(error.message);
      }

      const basket = await CustomerQuotationBasketService.updateItem(
        userId,
        productId,
        value.quantity
      );

      res.status(200).json({
        success: true,
        data: basket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/customer/quotation-basket/items/{productId}:
   *   delete:
   *     summary: Remove item from basket
   *     tags: [Customer Quotation Basket]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Item removed successfully
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Item not found in basket
   */
  static async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { productId } = req.params as { productId: string };

      const basket = await CustomerQuotationBasketService.removeItem(userId, productId);

      res.status(200).json({
        success: true,
        data: basket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/customer/quotation-basket:
   *   delete:
   *     summary: Clear entire basket
   *     tags: [Customer Quotation Basket]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       204:
   *         description: Basket cleared successfully
   *       401:
   *         description: Unauthorized
   */
  static async clearBasket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      await CustomerQuotationBasketService.clearBasket(userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
