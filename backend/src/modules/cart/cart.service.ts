import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../common/errors/api.error';
import { logger } from '../../common/logger/logger';
import { CartStatus } from '@prisma/client';

export class CartService {
  private static async resolveMainWarehouseId(): Promise<string | null> {
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { isMain: true },
          { name: { equals: 'Main Warehouse', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      orderBy: { isMain: 'desc' },
    });

    return warehouse?.id ?? null;
  }

  private static async getAvailableStock(productId: string, fallbackStock: number): Promise<number> {
    const mainWarehouseId = await this.resolveMainWarehouseId();
    if (!mainWarehouseId) return fallbackStock;

    const inventory = await prisma.inventory.findUnique({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId: mainWarehouseId,
        },
      },
      select: {
        quantity: true,
        reservedQuantity: true,
      },
    });

    if (!inventory) return fallbackStock;
    return Math.max(0, Number(inventory.quantity) - Number(inventory.reservedQuantity));
  }

  private static async getAvailableStockMap(productIds: string[]): Promise<Map<string, number>> {
    if (!productIds.length) return new Map<string, number>();

    const mainWarehouseId = await this.resolveMainWarehouseId();
    if (!mainWarehouseId) return new Map<string, number>();

    const inventories = await prisma.inventory.findMany({
      where: {
        warehouseId: mainWarehouseId,
        productId: { in: productIds },
      },
      select: {
        productId: true,
        quantity: true,
        reservedQuantity: true,
      },
    });

    return new Map(
      inventories.map((inv) => [
        inv.productId,
        Math.max(0, Number(inv.quantity) - Number(inv.reservedQuantity)),
      ])
    );
  }

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
      logger.info(`New active cart created for user: ${userId}`);
    }

    return cart;
  }

  /**
   * Lightweight helper for mutation flows that only need cart id.
   */
  private static async getOrCreateActiveCartId(userId: string): Promise<string> {
    const cart = await prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (cart) return cart.id;

    const created = await prisma.cart.create({
      data: {
        userId,
        status: CartStatus.ACTIVE,
      },
      select: { id: true },
    });

    logger.info(`New active cart created for user: ${userId}`);
    return created.id;
  }

  private static async getActiveCartId(userId: string): Promise<string | null> {
    const cart = await prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      select: { id: true },
    });
    return cart?.id ?? null;
  }

  static async findCartItem(userId: string, productId: string) {
    const cartId = await this.getActiveCartId(userId);

    if (!cartId) {
      return null;
    }

    return prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
      select: { id: true },
    });
  }

  /**
   * Get user cart
   */
  static async getCart(userId: string) {
    const cart = await this.getOrCreateActiveCart(userId);
    const productIds = (cart.items || []).map((item) => item.productId);
    const availableStockMap = await this.getAvailableStockMap(productIds);

    return {
      ...cart,
      items: (cart.items || []).map((item) => ({
        ...item,
        product: {
          ...item.product,
          stock: availableStockMap.get(item.productId) ?? item.product.stock,
        },
      })),
    };
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

    // 2. Check available stock (quantity - reserved)
    const availableStock = await this.getAvailableStock(productId, product.stock);
    if (availableStock < quantity) {
      throw new BadRequestError(`Only ${availableStock} items in stock`);
    }

    // 3. Get or create active cart
    const cartId = await this.getOrCreateActiveCartId(userId);

    // 4. Add or update item in cart with price snapshot
    const cartItem = await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId,
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
        cartId,
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

    const cartId = await this.getActiveCartId(userId);

    if (!cartId) {
      throw new NotFoundError('Active cart not found');
    }

    // Check product and stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new BadRequestError('Product is unavailable');
    }

    const availableStock = await this.getAvailableStock(productId, product.stock);
    if (availableStock < quantity) {
      throw new BadRequestError(`Only ${availableStock} items in stock`);
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        cartId_productId: {
          cartId,
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
    const cartItem = await this.findCartItem(userId, productId);

    if (!cartItem) {
      throw new NotFoundError('Cart item not found');
    }

    const cartId = await this.getActiveCartId(userId);

    if (!cartId) {
      throw new NotFoundError('Active cart not found');
    }

    await prisma.cartItem.delete({
      where: {
        cartId_productId: {
          cartId,
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
    const cartId = await this.getActiveCartId(userId);

    if (!cartId) {
      return { removedItems: 0 };
    }

    const { count } = await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    logger.info(`Cart cleared for user ${userId} (removed ${count} item(s))`);

    return { removedItems: count };
  }
}
