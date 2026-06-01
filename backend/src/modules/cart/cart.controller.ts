/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response, NextFunction } from 'express';
import { CartService } from './cart.service';
import SettingsService from '../settings/settings.service';
import { AuthRequest } from '../../types/global';
import { NotFoundError } from '../../common/errors/api.error';

const messages: any = {
  en: {
    added: 'Item added to cart',
    updated: 'Cart updated',
    removed: 'Item removed from cart',
    cleared: 'Cart cleared',
  },
  ar: {
    added: 'تمت إضافة المنتج إلى السلة',
    updated: 'تم تحديث السلة',
    removed: 'تمت إزالة المنتج من السلة',
    cleared: 'تم مسح السلة',
  },
};

export class CartController {
  private static getRequestOrigin(req: Request): string {
    const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
    const isProduction = process.env.NODE_ENV === 'production';
    const protocol = isProduction ? 'https' : (forwardedProto || req.protocol);
    const host = forwardedHost || req.get('host');

    return host ? `${protocol}://${host}` : '';
  }

  private static resolvePublicImageUrl(req: Request, imagePath?: string | null): string | null {
    if (!imagePath) return null;

    if (/^(https?:\/\/|data:|blob:)/i.test(imagePath)) {
      return imagePath;
    }

    const normalized = imagePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
    const pathPart = normalized.startsWith('/') ? normalized : `/${normalized}`;

    if (
      normalized.startsWith('images/') ||
      normalized.startsWith('uploads/') ||
      pathPart.startsWith('/images/') ||
      pathPart.startsWith('/uploads/')
    ) {
      const origin = this.getRequestOrigin(req);
      return origin ? `${origin}${pathPart}` : pathPart;
    }

    return imagePath;
  }

  private static getMessage(lang: string = 'en', key: string) {
    return messages[lang]?.[key] || messages['en'][key];
  }

  private static normalizeCart(req: Request, cart: any, lang: string, currency: string) {
    let totalAmount = 0;

    const items = (cart?.items || []).map((item: any) => {
      const translation = item.product.translations.find((t: any) => t.locale === lang)
        || item.product.translations.find((t: any) => t.locale === 'en');

      const itemPrice = Number(item.priceAtTime);
      const subtotal = itemPrice * item.quantity;
      totalAmount += subtotal;

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: itemPrice,
        subtotal,
        product: {
          id: item.product.id,
          name: translation?.name || 'Unknown',
          description: translation?.description,
          thumbnail: this.resolvePublicImageUrl(
            req,
            (item.product as any).mainImage || item.product.attachments?.[0]?.fileUrl || null
          ),
          isActive: item.product.isActive,
          stock: item.product.stock,
        },
      };
    });

    return {
      ...cart,
      items,
      totalAmount,
      currency,
    };
  }

  /**
   * @swagger
   * /api/cart:
   *   get:
   *     summary: Get user's active cart
   *     tags: [Cart Management]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Cart details
   */
  static async getCart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const currency = await SettingsService.getCurrency();
      const cart: any = await CartService.getCart(userId);

      res.status(200).json({
        success: true,
        data: CartController.normalizeCart(req, cart, lang, currency),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/cart/add:
   *   post:
   *     summary: Add an item to the cart
   *     tags: [Cart Management]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [productId]
   *             properties:
   *               productId: { type: string, format: uuid }
   *               quantity: { type: number, default: 1 }
   *     responses:
   *       201:
   *         description: Item added
   */
  static async addItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const currency = await SettingsService.getCurrency();
      const { productId, quantity } = req.body;
      await CartService.addItem(userId, productId, quantity);
      const cart = await CartService.getCart(userId);
      
      res.status(201).json({
        success: true,
        message: CartController.getMessage(lang, 'added'),
        data: CartController.normalizeCart(req, cart, lang, currency),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/cart/update:
   *   put:
   *     summary: Update cart item quantity
   *     tags: [Cart Management]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [productId, quantity]
   *             properties:
   *               productId: { type: string, format: uuid }
   *               quantity: { type: number }
   *     responses:
   *       200:
   *         description: Cart updated
   */
  static async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const currency = await SettingsService.getCurrency();
      const { productId, quantity } = req.body;
      await CartService.updateItem(userId, productId, quantity);
      const cart = await CartService.getCart(userId);
      
      res.status(200).json({
        success: true,
        message: CartController.getMessage(lang, 'updated'),
        data: CartController.normalizeCart(req, cart, lang, currency),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/cart/remove/{productId}:
   *   delete:
   *     summary: Remove item from cart
   *     tags: [Cart Management]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: productId
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Item removed
   */
  static async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const currency = await SettingsService.getCurrency();
      const { productId } = req.params;

      const cartItemExists = Boolean(await CartService.findCartItem(userId, productId as string));

      if (!cartItemExists) {
        throw new NotFoundError('Cart item not found');
      }

      await CartService.removeItem(userId, productId as string);
      const updatedCart = await CartService.getCart(userId);
      
      res.status(200).json({
        success: true,
        message: CartController.getMessage(lang, 'removed'),
        data: CartController.normalizeCart(req, updatedCart, lang, currency),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/cart/clear:
   *   delete:
   *     summary: Clear entire cart
   *     tags: [Cart Management]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Cart cleared
   */
  static async clearCart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const currency = await SettingsService.getCurrency();
      await CartService.clearCart(userId);
      const cart = await CartService.getCart(userId);
      
      res.status(200).json({
        success: true,
        message: CartController.getMessage(lang, 'cleared'),
        data: CartController.normalizeCart(req, cart, lang, currency),
      });
    } catch (error) {
      next(error);
    }
  }
}
