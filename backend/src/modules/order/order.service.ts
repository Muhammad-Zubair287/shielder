import { prisma } from '@/config/database';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import crypto from 'crypto';
import { OrderStatus, PaymentStatus, StockChangeType, Prisma, NotificationType, UserRole } from '@prisma/client';
import NotificationService from '@/modules/notification/notification.service';
import { StockAlertService } from '../inventory/stock-alert/stock-alert.service';
import { inventoryService } from '../inventory/inventory.service';
import { orderRepository } from './order.repository';
import redisCacheService from '@/common/services/redis-cache.service';
import { CACHE_KEYS } from '@/common/constants/cache-keys';

type OrderItemInput = {
  productId: string;
  quantity: number;
  variantId?: string | null;
};

type CreateOrderInput = {
  userId: string;
  items: OrderItemInput[];
  customerName?: string;
  phoneNumber?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  notes?: string;
  deliveryType?: 'DELIVERY' | 'PICKUP';
  warehouseId?: string;
};

type OrderFilters = {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: keyof Prisma.OrderOrderByWithRelationInput;
  sortOrder?: Prisma.SortOrder;
};

type PaginationInput = {
  skip: number;
  limit: number;
};

type PublicImageAttachment = {
  fileUrl: string;
  url: string;
};

type AuthenticatedUser = {
  userId: string;
  role: UserRole;
  email?: string;
};

export class OrderService {
  private validateStatusTransition(current: OrderStatus, next: OrderStatus, deliveryType: 'DELIVERY' | 'PICKUP') {
    if (current === next) return;

    const deliveryTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.READY_FOR_PICKUP]: [],
    };

    const pickupTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [],
      [OrderStatus.DELIVERED]: [],
    };

    const transitions = deliveryType === 'PICKUP' ? pickupTransitions : deliveryTransitions;
    const allowed = transitions[current] || [];

    if (!allowed.includes(next)) {
      throw new BadRequestError(`Invalid status transition from ${current} to ${next}`);
    }
  }

  private async invalidateDashboardCaches() {
    await Promise.all([
      redisCacheService.del(CACHE_KEYS.SUPERADMIN_DASHBOARD_SUMMARY),
      redisCacheService.del(CACHE_KEYS.SUPERADMIN_MONTHLY_ANALYTICS),
    ]);
  }

  private static resolvePublicImageUrl(imagePath?: string | null): string | null {
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
      return pathPart;
    }

    return imagePath;
  }

  private async resolveOrderWarehouseId(
    deliveryType: 'DELIVERY' | 'PICKUP',
    pickupWarehouseId?: string,
  ): Promise<string> {
    return inventoryService.resolveWarehouseForOrder(deliveryType, pickupWarehouseId);
  }

  private async reserveInventoryForItem(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    orderedQuantity: number,
  ) {
    const quantityToReserve = Math.max(0, Math.trunc(orderedQuantity));
    if (quantityToReserve <= 0) {
      throw new BadRequestError('Invalid order quantity');
    }

    // Ensure inventory record exists for this product-warehouse combination
    // This prevents "no rows affected" errors when trying to reserve stock
    await tx.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
      create: {
        productId,
        warehouseId,
        quantity: 0,
        reservedQuantity: 0,
      },
      update: {},
    });

    await inventoryService.reserveStock(productId, warehouseId, quantityToReserve, tx);
  }

  private static normalizeAttachments(product: any) {
    const attachments = Array.isArray(product?.attachments) ? product.attachments : [];

    return attachments.map((attachment: any) => {
      const fileUrl = OrderService.resolvePublicImageUrl(attachment?.fileUrl ?? attachment?.url ?? null) || '';
      return {
        ...attachment,
        fileUrl,
        url: fileUrl,
      } satisfies PublicImageAttachment;
    });
  }

  private static normalizeOrderItem(item: any) {
    const product = item?.product;
    if (!product) return item;

    return {
      ...item,
      product: {
        ...product,
        mainImage: OrderService.resolvePublicImageUrl(product.mainImage),
        thumbnail: OrderService.resolvePublicImageUrl(
          product.attachments?.[0]?.fileUrl || product.attachments?.[0]?.url || product.mainImage || null
        ),
        attachments: OrderService.normalizeAttachments(product),
      },
    };
  }

  private static normalizeOrder(order: any) {
    if (!order) return order;

    return {
      ...order,
      orderItems: Array.isArray(order.orderItems)
        ? order.orderItems.map((item: any) => OrderService.normalizeOrderItem(item))
        : order.orderItems,
    };
  }

  /**
   * Load order-related system settings from DB (with safe defaults)
   */
  private async getOrderSettings() {
    try {
      const s = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
      return {
        defaultOrderStatus: (s?.defaultOrderStatus as OrderStatus) ?? OrderStatus.PENDING,
        allowOrderCancellation: s?.allowOrderCancellation ?? true,
        autoCompleteOrderAfterPayment: s?.autoCompleteOrderAfterPayment ?? true,
        paymentMethodsEnabled: Array.isArray(s?.paymentMethodsEnabled) ? s.paymentMethodsEnabled as string[] : null,
      };
    } catch {
      return {
        defaultOrderStatus: OrderStatus.PENDING,
        allowOrderCancellation: true,
        autoCompleteOrderAfterPayment: true,
        paymentMethodsEnabled: null,
      };
    }
  }

  /**
   * Create a new order with stock deduction
   */
  async createOrder(data: CreateOrderInput) {
    const { userId, items, deliveryType: requestedDeliveryType, warehouseId, ...orderData } = data;

    // Apply safe defaults: DELIVERY is default if not specified
    const deliveryType = requestedDeliveryType || 'DELIVERY';

    // STEP 1: Validate warehouse for PICKUP orders
    let validatedWarehouseId: string | undefined = undefined;
    let pickupWarehouseSummary: string | undefined = undefined;
    if (deliveryType === 'PICKUP') {
      // PICKUP requires warehouseId
      if (!warehouseId) {
        throw new BadRequestError('warehouseId is required for PICKUP delivery type');
      }

      // Validate warehouse exists and is active
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true, isActive: true, name: true }
      });

      if (!warehouse) {
        throw new NotFoundError(`Warehouse with ID ${warehouseId} not found`);
      }

      if (!warehouse.isActive) {
        throw new BadRequestError(`Warehouse "${warehouse.name}" is not active`);
      }

      validatedWarehouseId = warehouse.id;
      pickupWarehouseSummary = `${warehouse.name}`;
    }
    // For DELIVERY: warehouseId is ignored (remains undefined)

    // Read configured default order status
    const { defaultOrderStatus, paymentMethodsEnabled } = await this.getOrderSettings();

    // Validate payment method is enabled
    const chosenMethod = orderData.paymentMethod || 'CASH';
    if (paymentMethodsEnabled && paymentMethodsEnabled.length > 0 && !paymentMethodsEnabled.includes(chosenMethod)) {
      throw new BadRequestError(`Payment method "${chosenMethod}" is not currently enabled. Allowed: ${paymentMethodsEnabled.join(', ')}`);
    }

    // Generate a human-readable order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reservationWarehouseId = await this.resolveOrderWarehouseId(deliveryType, validatedWarehouseId);
      const initialStatus = orderData.status || (deliveryType === 'PICKUP'
        ? OrderStatus.READY_FOR_PICKUP
        : OrderStatus.PENDING);

      // 1. Prepare order items and check basic existence
      const orderItemsData = [];
      
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, price: true, translations: { where: { locale: 'en' }, select: { name: true } } }
        });

        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`);
        }

        // Handle variant if provided
        if (item.variantId) {
          const variant = await tx.product_variants.findUnique({
            where: { id: item.variantId }
          });
          if (!variant) throw new NotFoundError(`Variant with ID ${item.variantId} not found`);
        }

        await this.reserveInventoryForItem(tx, item.productId, reservationWarehouseId, item.quantity);

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice: new Prisma.Decimal(product.price).mul(item.quantity)
        });
      }

      // 2. Calculate financial details
      const subtotal = orderItemsData.reduce((acc, item) => acc.add(item.totalPrice), new Prisma.Decimal(0));
      const taxRate = 0.1; // 10% tax for example, or get from config
      const tax = subtotal.mul(taxRate);
      const total = subtotal.add(tax);

      // 4. Create the order
      const result = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          tax,
          total,
          customerName: orderData.customerName || 'Guest Customer',
          phoneNumber: orderData.phoneNumber,
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod || 'CASH',
          paymentStatus: orderData.paymentStatus || PaymentStatus.PENDING,
          status: initialStatus || defaultOrderStatus,
          notes: orderData.notes,
          deliveryType,
          warehouseId: validatedWarehouseId || undefined,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: true
        }
      });

      return result;
    }, {
      timeout: 15000,
      maxWait: 5000,
    });

    // 5. Trigger Notifications (fire-and-forget — never block the order response)
    const pickupSuffix = deliveryType === 'PICKUP'
      ? ` Pickup warehouse: ${pickupWarehouseSummary || validatedWarehouseId || 'N/A'}.`
      : '';

    NotificationService.notify({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order Created',
      message: `A new order ${order.orderNumber} has been placed. Total: SAR ${order.total}.${pickupSuffix}`,
      module: 'ORDER',
      roleTarget: UserRole.SUPER_ADMIN,
      relatedId: order.id
    }).catch((err) => console.error('[Order] createOrder notification failed:', err));

    NotificationService.notify({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order Created',
      message: `A new order ${order.orderNumber} has been placed. Total: SAR ${order.total}.${pickupSuffix}`,
      module: 'ORDER',
      roleTarget: UserRole.ADMIN,
      relatedId: order.id,
    }).catch((err) => console.error('[Order] createOrder admin notification failed:', err));

    await this.invalidateDashboardCaches();

    return order;
  }

  /**
   * Get all orders with filtering and pagination
   */
  async getOrders(filters: OrderFilters, pagination: PaginationInput) {
    const { skip, limit } = pagination;
    const { search, status, paymentStatus, dateFrom, dateTo, sortBy, sortOrder } = filters;

    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const sortField: keyof Prisma.OrderOrderByWithRelationInput = sortBy ?? 'createdAt';
    const resolvedSortOrder: Prisma.SortOrder = sortOrder ?? 'desc';
    const orderBy = {
      [sortField as string]: resolvedSortOrder,
    } as Prisma.OrderOrderByWithRelationInput;

    const [total, orders] = await Promise.all([
      orderRepository.count(where),
      orderRepository.list(where, skip, limit, orderBy),
    ]);

    return {
      orders: orders.map((order) => OrderService.normalizeOrder(order)),
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single order by ID
   * Enforces ownership check: customers can only access their own orders
   * Admin/Super Admin can access any order
   */
  async getOrderById(id: string, user?: AuthenticatedUser) {
    const order = await orderRepository.findByIdWithDetails(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Ownership check: customer can only access their own orders
    // Admin/Super Admin bypass this check
    if (user && user.role === UserRole.USER && order.userId !== user.userId) {
      const linkedQuotation = user.email
        ? await prisma.quotation.findFirst({
            where: {
              convertedOrderId: id,
              customerEmail: { equals: user.email, mode: 'insensitive' },
            },
            select: { id: true },
          })
        : null;

      if (!linkedQuotation) {
        throw new NotFoundError('Order not found'); // Return 404 to avoid leaking existence
      }
    }

    return OrderService.normalizeOrder(order);
  }

  /**
   * Update order status with stock management
   */
  async updateOrderStatus(id: string, data: { status?: OrderStatus, paymentStatus?: PaymentStatus, performedBy?: string }) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        orderItems: { 
          include: { 
            product: { 
              include: { 
                translations: { 
                  where: { locale: 'en' } 
                } 
              } 
            }, 
            variant: true 
          } 
        } 
      }
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Enforce order settings from system configuration
    const { allowOrderCancellation, autoCompleteOrderAfterPayment } = await this.getOrderSettings();

    // Block cancellation if the setting is disabled
    if (data.status === OrderStatus.CANCELLED && !allowOrderCancellation) {
      throw new BadRequestError('Order cancellation is currently disabled by your administrator.');
    }

    // Auto-complete order when payment is received (if setting is enabled)
    if (
      data.paymentStatus === PaymentStatus.PAID &&
      autoCompleteOrderAfterPayment &&
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      data.status = OrderStatus.DELIVERED;
    }

    const previousStatus = order.status;
    const newStatus = data.status;
    const performedBy = data.performedBy || 'System/Admin';

    if (newStatus) {
      this.validateStatusTransition(previousStatus, newStatus, order.deliveryType as 'DELIVERY' | 'PICKUP');
    }

    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orderWarehouseId = await this.resolveOrderWarehouseId(
        order.deliveryType as 'DELIVERY' | 'PICKUP',
        order.warehouseId ?? undefined,
      );

      const completionStatuses = new Set<OrderStatus>([OrderStatus.DELIVERED, OrderStatus.COMPLETED]);
      const wasAlreadyCompleted = completionStatuses.has(previousStatus);
      const isMovingToCompleted = Boolean(newStatus && completionStatuses.has(newStatus));

      // 1. Handle completion logic (DELIVERED / COMPLETED)
      if (isMovingToCompleted && !wasAlreadyCompleted && newStatus) {
        for (const item of order.orderItems) {
          // Check stock for variant path (variant remains global for now).
          if (item.variantId && item.variant) {
            if (item.variant.stock < item.quantity) {
              throw new BadRequestError(`Insufficient stock for variant "${item.variant.name}". Cannot complete this order.`);
            }
          }

          // Consume reserved inventory from the order warehouse.
          await inventoryService.consumeReservedStock(item.productId, orderWarehouseId, item.quantity, tx);

          // Maintain legacy aggregate stock field for backward compatibility.
          const productUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });

          if (productUpdate.count === 0) {
            const productName = item.product.translations[0]?.name || 'Product';
            throw new BadRequestError(`Insufficient stock for "${productName}". Cannot complete this order.`);
          }

          // Keep existing variant stock logic intact.
          if (item.variantId) {
            await tx.product_variants.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } }
            });
          }

          // Maintain Stock Log
          const productName = item.product.translations[0]?.name || 'Product';
          await tx.stock_history.create({
            data: {
              id: crypto.randomUUID(),
              product_id: item.productId,
              product_name: item.variantId ? `${productName} (${item.variant?.name})` : productName,
              order_id: order.id,
              quantity: -item.quantity,
              type: StockChangeType.ORDER_COMPLETED,
              performed_by: performedBy,
              note: `Order ${order.orderNumber} marked as ${newStatus}`
            }
          });

          // Trigger Low Stock Alert
          await StockAlertService.checkAndNotify(item.productId);
        }
      }

      // 2. Handle cancellation paths.
      if (newStatus === OrderStatus.CANCELLED && wasAlreadyCompleted) {
        for (const item of order.orderItems) {
          await inventoryService.increaseStock(item.productId, orderWarehouseId, item.quantity, tx);

          // Restore Stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });

          if (item.variantId) {
            await tx.product_variants.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } }
            });
          }

          // Log Action
          const productName = item.product.translations[0]?.name || 'Product';
          await tx.stock_history.create({
            data: {
              id: crypto.randomUUID(),
              product_id: item.productId,
              product_name: item.variantId ? `${productName} (${item.variant?.name})` : productName,
              order_id: order.id,
              quantity: item.quantity,
              type: StockChangeType.ORDER_CANCELLED,
              performed_by: performedBy,
              note: `Order ${order.orderNumber} cancelled. Stock restored.`
            }
          });
        }
      }

      // If order is cancelled before completion, release reservation only.
      if (newStatus === OrderStatus.CANCELLED && !wasAlreadyCompleted) {
        for (const item of order.orderItems) {
          await inventoryService.releaseReservedStock(item.productId, orderWarehouseId, item.quantity, tx);
        }
      }

      // 3. Update Order Status
      return await tx.order.update({
        where: { id },
        data: {
          status: data.status || order.status,
          paymentStatus: data.paymentStatus || order.paymentStatus,
          updatedAt: new Date()
        }
      });
    });

    // 4. Send Status Change Notification (fire-and-forget)
    if (newStatus && newStatus !== previousStatus) {
      NotificationService.notify({
        type: NotificationType.ORDER_COMPLETED,
        title: `Order Status Updated`,
        message: `Your order ${order.orderNumber} is now ${newStatus}.`,
        module: 'ORDER',
        userId: order.userId,
        relatedId: order.id
      }).catch((err) => console.error('[Order] updateStatus user notification failed:', err));

      if (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.COMPLETED) {
        NotificationService.notify({
          type: NotificationType.ORDER_COMPLETED,
          title: 'Order Delivered',
          message: `Order ${order.orderNumber} has been successfully completed.`,
          module: 'ORDER',
          roleTarget: UserRole.SUPER_ADMIN,
          relatedId: order.id
        }).catch((err) => console.error('[Order] updateStatus admin notification failed:', err));
      }
    }

    await this.invalidateDashboardCaches();

    return updatedOrder;
  }

  /**
   * Get orders for the authenticated customer (customer self-service)
   */
  async getMyOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = { userId };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          warehouse: {
            select: {
              name: true,
              address: true,
              city: true,
              country: true,
            },
          },
          orderItems: {
            include: {
              product: {
                include: {
                  translations: { where: { locale: 'en' }, select: { name: true } },
                  attachments:  { where: { type: 'IMAGE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } },
                },
              },
            },
          },
          payments: { select: { amount: true, status: true, method: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      orders: orders.map((order) => OrderService.normalizeOrder(order)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get summary for dashboard
   */
  async getOrderSummary() {
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders
    };
  }
}

export const orderService = new OrderService();
