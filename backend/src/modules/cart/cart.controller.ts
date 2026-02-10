import { Response, NextFunction } from 'express';
import { CartService } from './cart.service';
import { AuthRequest } from '../../types/global';

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
  private static getMessage(lang: string = 'en', key: string) {
    return messages[lang]?.[key] || messages['en'][key];
  }

  /**
   * Get user cart
   */
  static async getCart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const cart: any = await CartService.getCart(userId);
      
      let totalAmount = 0;

      // Sanitize and calculate item subtotals
      if (cart && cart.items) {
        cart.items = cart.items.map((item: any) => {
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
            subtotal: subtotal,
            product: {
              id: item.product.id,
              name: translation?.name || 'Unknown',
              description: translation?.description,
              thumbnail: item.product.attachments?.find((a: any) => a.type === 'IMAGE')?.fileUrl || null,
              isActive: item.product.isActive,
            }
          };
        });
      }

      res.status(200).json({
        success: true,
        data: {
          ...cart,
          totalAmount: totalAmount,
          currency: 'USD', // You can make this dynamic based on locale
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add item to cart
   */
  static async addItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const { productId, quantity } = req.body;
      const cartItem = await CartService.addItem(userId, productId, quantity);
      
      res.status(201).json({
        success: true,
        message: CartController.getMessage(lang, 'added'),
        data: cartItem,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update item quantity
   */
  static async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const { productId, quantity } = req.body;
      const cartItem = await CartService.updateItem(userId, productId, quantity);
      
      res.status(200).json({
        success: true,
        message: CartController.getMessage(lang, 'updated'),
        data: cartItem,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove item from cart
   */
  static async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      const { productId } = req.params;
      await CartService.removeItem(userId, productId as string);
      
      res.status(200).json({
        success: true,
        message: CartController.getMessage(lang, 'removed'),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear cart
   */
  static async clearCart(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang = req.user!.preferredLanguage || 'en';
      await CartService.clearCart(userId);
      
      res.status(200).json({
        success: true,
        message: CartController.getMessage(lang, 'cleared'),
      });
    } catch (error) {
      next(error);
    }
  }
}
