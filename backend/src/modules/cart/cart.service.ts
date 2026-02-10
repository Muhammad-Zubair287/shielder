import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../common/errors/api.error';
import { logger } from '../../common/logger/logger';
import { CartStatus } from '@prisma/client';

export class CartService {
  /**
   * Get or create an active cart for the user
   */
  private static async getOrCreateActiveCart(userId: string) {
    let cart = await prisma.cart.findFirst({
      where: { 
        userId,
        status: CartStatus.ACTIVE
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { 
          userId,
          status: CartStatus.ACTIVE
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });
      logger.info(`New active cart created for user: ${userId}`);
    }

    return cart;
  }

  /**
   * Get user cart
   */
  static async getCart(userId: string) {
    return this.getOrCreateActiveCart(userId);
  }

  /**
   * Add item to cart
   */
  static async addItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than zero');
    }

    // 1. Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestError('Product is currently inactive');
    }

    // 2. Check stock
    if (product.stock < quantity) {
      throw new BadRequestError(`Only ${product.stock} items in stock`);
    }

    // 3. Get or create active cart
    const cart = await this.getOrCreateActiveCart(userId);

    // 4. Add or update item in cart with price snapshot
    const cartItem = await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
        priceAtTime: product.price, // Update snapshot to current price
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
        priceAtTime: product.price, // Snapshot price
      },
    });

    logger.info(`Product ${productId} added to cart for user ${userId} at price ${product.price}`);
    return cartItem;
  }

  /**
   * Update item quantity in cart
   */
  static async updateItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    const cart = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (!cart) {
      throw new NotFoundError('Active cart not found');
    }

    // Check product and stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestError('Product is unavailable');
    }

    if (product.stock < quantity) {
      throw new BadRequestError(`Only ${product.stock} items in stock`);
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      data: { 
        quantity,
        priceAtTime: product.price // Optional: update snapshot when quantity changes? 
      },
    });

    return updatedItem;
  }

  /**
   * Remove item from cart
   */
  static async removeItem(userId: string, productId: string) {
    const cart = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (!cart) {
      throw new NotFoundError('Active cart not found');
    }

    await prisma.cartItem.delete({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    logger.info(`Product ${productId} removed from cart for user ${userId}`);
  }

  /**
   * Clear all items from cart
   */
  static async clearCart(userId: string) {
    const cart = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      logger.info(`Cart cleared for user ${userId}`);
    }
  }
}
