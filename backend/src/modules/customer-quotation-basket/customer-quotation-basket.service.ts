/**
 * Customer Quotation Basket Service
 * Manages persistent quotation baskets linked to customers
 * Replaces localStorage-based client storage with backend persistence
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../common/errors/api.error';
import { logger } from '../../common/logger/logger';
import { Prisma } from '@prisma/client';

export class CustomerQuotationBasketService {
  /**
   * Get or create empty basket for user
   */
  private static async getOrCreateBasket(userId: string) {
    let basket = await prisma.quotationBasket.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                translations: true,
                attachments: {
                  where: { type: 'IMAGE' },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!basket) {
      basket = await prisma.quotationBasket.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  attachments: {
                    where: { type: 'IMAGE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });
      logger.info(`New quotation basket created for user: ${userId}`);
    }

    return basket;
  }

  /**
   * Get customer's quotation basket
   */
  static async getBasket(userId: string) {
    const basket = await this.getOrCreateBasket(userId);

    const items = basket.items.map(item => ({
      productId: item.productId,
      name: item.product.translations[0]?.name || 'Product',
      sku: item.product.sku,
      price: Number(item.product.price),
      quantity: item.quantity,
      stock: item.product.stock,
      thumbnail: item.product.attachments[0]?.fileUrl || item.product.mainImage,
    }));

    return {
      items,
      itemCount: items.length,
      totalQuantity: basket.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  /**
   * Add or update item in basket
   */
  static async addItem(userId: string, productId: string, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestError('Quantity must be at least 1');
    }

    // Validate product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true, stock: true },
    });

    if (!product) {
      throw new NotFoundError(`Product not found: ${productId}`);
    }

    if (!product.isActive) {
      throw new BadRequestError(`Product is no longer available`);
    }

    // Validate stock (warning only, don't block)
    if (product.stock < quantity) {
      logger.warn(
        `Quotation item quantity ${quantity} exceeds stock ${product.stock} for product ${productId}`
      );
    }

    // Get or create basket
    const basket = await this.getOrCreateBasket(userId);

    // Check if item already exists
    const existingItem = await prisma.quotationBasketItem.findUnique({
      where: {
        basketId_productId: {
          basketId: basket.id,
          productId,
        },
      },
    });

    let item;
    if (existingItem) {
      // Update quantity
      item = await prisma.quotationBasketItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    } else {
      // Create new item
      item = await prisma.quotationBasketItem.create({
        data: {
          basketId: basket.id,
          productId,
          quantity,
        },
      });
    }

    logger.info(`Added product ${productId} to basket for user ${userId}, qty: ${quantity}`);

    // Return updated basket
    return this.getBasket(userId);
  }

  /**
   * Update item quantity in basket
   */
  static async updateItem(userId: string, productId: string, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestError('Quantity must be at least 1');
    }

    const basket = await prisma.quotationBasket.findUnique({
      where: { userId },
    });

    if (!basket) {
      throw new NotFoundError('Basket not found');
    }

    const item = await prisma.quotationBasketItem.findUnique({
      where: {
        basketId_productId: {
          basketId: basket.id,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundError(`Item not in basket: ${productId}`);
    }

    await prisma.quotationBasketItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    logger.info(`Updated product ${productId} in basket for user ${userId}, qty: ${quantity}`);

    return this.getBasket(userId);
  }

  /**
   * Remove item from basket
   */
  static async removeItem(userId: string, productId: string) {
    const basket = await prisma.quotationBasket.findUnique({
      where: { userId },
    });

    if (!basket) {
      throw new NotFoundError('Basket not found');
    }

    const item = await prisma.quotationBasketItem.findUnique({
      where: {
        basketId_productId: {
          basketId: basket.id,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundError(`Item not in basket: ${productId}`);
    }

    await prisma.quotationBasketItem.delete({
      where: { id: item.id },
    });

    logger.info(`Removed product ${productId} from basket for user ${userId}`);

    return this.getBasket(userId);
  }

  /**
   * Clear entire basket
   */
  static async clearBasket(userId: string) {
    const basket = await prisma.quotationBasket.findUnique({
      where: { userId },
    });

    if (!basket) {
      throw new NotFoundError('Basket not found');
    }

    await prisma.quotationBasketItem.deleteMany({
      where: { basketId: basket.id },
    });

    logger.info(`Cleared quotation basket for user ${userId}`);
  }

  /**
   * Convert basket items to quotation format
   * Used when generating quotation from basket
   */
  static async getBasketItemsForQuotation(userId: string) {
    const basket = await prisma.quotationBasket.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { translations: true },
            },
          },
        },
      },
    });

    if (!basket || !basket.items.length) {
      throw new BadRequestError('Quotation basket is empty');
    }

    const items = basket.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    return items;
  }
}
